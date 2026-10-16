import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/modules/core/prisma/services";
import {
    Candidate,
    SearchHitDto,
    SearchResultDto,
} from "../dtos";
import { dice } from "@/utils/text";
import { AUTO_MARGIN, AUTO_SCORE } from "@/config/constant";

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) {}

  async search(heard: string[]): Promise<SearchResultDto> {
    if (heard.length < 3) return { hits: [], autoLoad: null };

    const q = heard.slice(-10).join(' ');

    // `<%` = word-similarity; checked both ways so it works whether the singer is mid-line
    // (heard is shorter than the line) or has just finished it (heard contains the line).
    const [, rows] = await this.prisma.$transaction([
      this.prisma.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.4`,
      this.prisma.$queryRaw<Candidate[]>`
        SELECT l."songId" AS "songId", s.title AS title, l.position AS position, l.normalized AS normalized
        FROM "Line" l
        JOIN "Song" s ON s.id = l."songId"
        WHERE l.normalized <% ${q}::text OR ${q}::text <% l.normalized
        ORDER BY GREATEST(
          word_similarity(l.normalized, ${q}::text),
          word_similarity(${q}::text, l.normalized)
        ) DESC
        LIMIT 25`,
    ]);

    const bestPerSong = new Map<number, SearchHitDto>();
    for (const row of rows) {
      const lw = row.normalized.split(' ').filter(Boolean);
      const n = Math.min(heard.length, lw.length);
      if (n < 3) continue;

      const sim = dice(heard.slice(-n).join(' '), lw.slice(0, n).join(' '));
      const score = sim * Math.sqrt(n / lw.length); // penalise partially-heard lines
      const current = bestPerSong.get(row.songId);
      if (!current || score > current.score) {
        bestPerSong.set(row.songId, {
          songId: row.songId,
          title: row.title,
          lineIndex: row.position,
          score,
          remaining: lw.length - n,
        });
      }
    }

    const hits = [...bestPerSong.values()].sort((a, b) => b.score - a.score).slice(0, 3);
    const [top, second] = hits;
    const clear = top && top.score >= AUTO_SCORE && (!second || top.score - second.score >= AUTO_MARGIN);

    return { hits, autoLoad: clear ? top : null };
  }

}