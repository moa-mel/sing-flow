import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";
import { MatchResultDto } from "../dtos";
import { dice, words } from "@/utils/text";

@Injectable()
export class MatchService {
    constructor(private prisma: PrismaService) { }

    static readonly WINDOW = 4;              // look a bit further ahead
    static readonly ADVANCE_SIMILARITY = 0.55; // was 0.7 — advance earlier
    static readonly MIN_COVERAGE = 0.4;       // was 0.6 — ~40% of the line is enough
    static readonly MIN_WORDS = 2;

    advance(lines: string[], current: number, heard: string[], offset: number): MatchResultDto {
        let idx = current;
        let off = offset;
        let advanced = false;

        while (idx < lines.length - 1) {
            const remaining = heard.slice(off);
            // FIX: Changed MatchingService to MatchService
            if (remaining.length < MatchService.MIN_WORDS) break;

            let best: { k: number; sim: number; lineWords: number } | null = null;

            for (let k = 0; k <= MatchService.WINDOW && idx + k < lines.length; k++) {
                const lw = words(lines[idx + k]);
                if (lw.length === 0) continue;

                const n = Math.min(remaining.length, lw.length);
                // FIX: Changed MatchingService to MatchService
                if (n < MatchService.MIN_WORDS || n / lw.length < MatchService.MIN_COVERAGE) continue;

                const sim = dice(remaining.slice(0, n).join(' '), lw.slice(0, n).join(' '));

                // FIX: Changed MatchingService to MatchService
                if (sim >= MatchService.ADVANCE_SIMILARITY && (!best || sim > best.sim + 0.05)) {
                    best = { k, sim, lineWords: lw.length };
                }
            }

            if (!best) break;

            idx = Math.min(idx + best.k + 1, lines.length - 1);

            // Count the whole line as used, even if we advanced early, so its tail words
            // aren't mistaken for the start of the next line.
            off += best.lineWords;
            advanced = true;
        }

        return { lineIndex: idx, offset: off, advanced };
    }
}