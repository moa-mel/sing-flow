
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { songs, normalize } from './hyms';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (const s of songs) {
    await prisma.$transaction(async (tx) => {
      const existingSong = await tx.song.findFirst({
        where: {
          title: s.title,
        },
      });

      let songId: number;

      if (existingSong) {
        const updatedSong = await tx.song.update({
          where: {
            id: existingSong.id,
          },
          data: {
            title: s.title,
            author: s.author,
          },
        });

        songId = updatedSong.id;

        // Remove all old lyric lines for this song.
        await tx.line.deleteMany({
          where: {
            songId,
          },
        });

        console.log(`Updated existing song: ${s.title}`);
      } else {
        const newSong = await tx.song.create({
          data: {
            title: s.title,
            author: s.author,
          },
        });

        songId = newSong.id;

        console.log(`Created new song: ${s.title}`);
      }

      // Insert the current lyrics from the seed.
      await tx.line.createMany({
        data: s.lines.map((text, position) => ({
          songId,
          position,
          text,
          normalized: normalize(text),
        })),
      });

      console.log(
        `${s.title}: ${s.lines.length} lines saved.`,
      );
    });
  }

  console.log(`Successfully seeded ${songs.length} songs.`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
