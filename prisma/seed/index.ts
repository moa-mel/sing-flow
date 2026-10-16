import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { songs, normalize } from './hyms';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const s of songs) {
    if (await prisma.song.findFirst({ where: { title: s.title } })) continue;
    await prisma.song.create({
      data: {
        title: s.title,
        author: s.author,
        lines: {
          create: s.lines.map((text, position) => ({
            position,
            text,
            normalized: normalize(text),
          })),
        },
      },
    });
  }
  console.log('Seeded', songs.length, 'songs');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());