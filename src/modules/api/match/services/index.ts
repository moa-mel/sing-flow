import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";
import { MatchResultDto } from "../dtos";
import { dice, words } from "@/utils/text";

@Injectable()
export class MatchService {
    constructor(private prisma: PrismaService) { }

    static readonly WINDOW = 4;        // how many lines ahead to consider
    static readonly TAIL = 4;          // how many recent heard words to compare
    static readonly SIMILARITY = 0.6;
    static readonly MIN_WORDS = 2;
    // Advance when the singer reaches the end of a line, or ~70% through it.
    static readonly CHECKPOINTS = [1, 0.7];

    /**
     * `offset` = number of heard words already used (consumed).
     * Returns the new offset, which is always heard.length after an advance,
     * so STT dropping words can never cause drift.
     */
    advance(
        lines: string[],
        current: number,
        heard: string[],
        offset: number,
    ): MatchResultDto {
        // Interim results can be revised shorter, so never trust a stale offset.
        let used = Math.min(offset, heard.length);

        if (current >= lines.length - 1) {
            return { lineIndex: current, offset: used, advanced: false };
        }

        const available = heard.length - used;
        if (available < 1) {
            return { lineIndex: current, offset: used, advanced: false };
        }

        let best: { k: number; sim: number } | null = null;

        for (let k = 0; k <= MatchService.WINDOW && current + k < lines.length; k++) {
            const lw = words(lines[current + k]);
            if (lw.length === 0) continue;

            for (const frac of MatchService.CHECKPOINTS) {
                const p = Math.max(1, Math.round(lw.length * frac));
                const m = Math.min(MatchService.TAIL, p, available);
                if (m < Math.min(MatchService.MIN_WORDS, p)) continue;

                const sim = dice(
                    heard.slice(heard.length - m).join(" "),
                    lw.slice(p - m, p).join(" "),
                );

                if (
                    sim >= MatchService.SIMILARITY &&
                    (!best || sim > best.sim + 0.05)
                ) {
                    best = { k, sim };
                }
            }
        }

        if (!best) {
            return { lineIndex: current, offset: used, advanced: false };
        }

        return {
            lineIndex: Math.min(current + best.k + 1, lines.length - 1),
            offset: heard.length, // consume everything heard so far
            advanced: true,
        };
    }
}