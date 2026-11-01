
import 'dotenv/config';

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const API_BASE_URL =
  process.env.HYMN_API_URL || 'https://hymnal.rindra.org';

const CONCURRENCY = 5;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

interface ExternalHymnSummary {
  ID: number;
  Number: number;
  Title: string;
  Author?: string | null;
  Category?: number;
  CategoryName?: string;
}

interface ExternalHymn {
  ID: number;
  Number: number;
  Title: string;
  Author?: string | null;
  Lyrics?: {
    label?: string;
    text?: string;
  }[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllHymns(): Promise<ExternalHymnSummary[]> {
  const response = await axios.get(
    `${API_BASE_URL}/api/hymns.json`,
    { timeout: 30000 },
  );

  if (!Array.isArray(response.data)) {
    throw new Error('Invalid response from Hymn API');
  }

  return response.data;
}

async function fetchHymnById(id: number): Promise<ExternalHymn> {
  const response = await axios.get(
    `${API_BASE_URL}/api/hymns/${id}.json`,
    { timeout: 30000 },
  );

  return response.data;
}

async function importHymn(summary: ExternalHymnSummary) {
  const externalId = summary.ID;

  // Check whether this external hymn has already been imported.
  const existing = await prisma.song.findUnique({
    where: {
      externalId,
    },
  });

  if (existing) {
    return 'skipped';
  }

  // Fetch the full hymn because the list endpoint has no lyrics.
  const hymn = await fetchHymnById(externalId);

  if (!hymn.Title || !Array.isArray(hymn.Lyrics)) {
    console.warn(`Skipping "${summary.Title}": no lyrics found`);
    return 'skipped';
  }

  // Convert the API lyrics into your Line model.
  // Each line gets a unique position, while section stores its verse label.
  const lines: {
    position: number;
    text: string;
    normalized: string;
    section: string | null;
  }[] = [];

  for (const verse of hymn.Lyrics) {
    if (!verse.text) continue;

    const section = verse.label?.trim() || null;

    const verseLines = verse.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const text of verseLines) {
      lines.push({
        position: lines.length,
        text,
        normalized: normalize(text),
        section,
      });
    }
  }

  if (lines.length === 0) {
    console.warn(`Skipping "${hymn.Title}": empty lyrics`);
    return 'skipped';
  }

  // Avoid duplicating an existing manually seeded song with the same title.
  const existingTitle = await prisma.song.findFirst({
    where: {
      title: {
        equals: hymn.Title,
        mode: 'insensitive',
      },
    },
  });

  if (existingTitle) {
    // Associate the external ID with the existing song.
    // Preserve its existing lyrics rather than overwriting curated content.
    await prisma.song.update({
      where: {
        id: existingTitle.id,
      },
      data: {
        externalId,
      },
    });

    console.log(`Linked existing song: ${hymn.Title}`);
    return 'skipped';
  }

  // Create the song and its lyrics together.
  await prisma.song.create({
    data: {
      externalId,
      title: hymn.Title,
      author: hymn.Author || null,
      lines: {
        create: lines,
      },
    },
  });

  console.log(`Imported: ${hymn.Title}`);

  return 'imported';
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing from your environment');
  }

  console.log('Fetching hymns from external API...');

  const hymns = await fetchAllHymns();

  console.log(`Found ${hymns.length} hymns`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let nextIndex = 0;

  // Process hymns with limited concurrency to avoid overwhelming the API.
  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= hymns.length) return;

      const hymn = hymns[index];

      try {
        const result = await importHymn(hymn);

        if (result === 'imported') {
          imported++;
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;

        console.error(
          `Failed to import "${hymn.Title}" (ID: ${hymn.ID}):`,
          error instanceof Error ? error.message : error,
        );
      }

      const processed = imported + skipped + failed;

      if (processed % 50 === 0) {
        console.log(
          `Progress: ${processed}/${hymns.length} | ` +
          `Imported: ${imported} | Skipped: ${skipped} | Failed: ${failed}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: CONCURRENCY },
      () => worker(),
    ),
  );

  console.log('\n========== IMPORT SUMMARY ==========');
  console.log(`Total hymns: ${hymns.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error('Import process failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
