import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";
import { MatchResultDto } from "../dtos";
import { dice, words } from "@/utils/text";

@Injectable()
export class MatchService {
    constructor(private prisma: PrismaService) {}

    static readonly WINDOW = 4;
    static readonly TAIL = 4;
    static readonly SIMILARITY = 0.6;
    static readonly MIN_WORDS = 2;
    static readonly CHECKPOINTS = [1, 0.7];

    advance(
        lines: string[],
        current: number,
        heard: string[],
        offset: number,
    ): MatchResultDto {
        const used = Math.min(Math.max(0, offset), heard.length);

        if (current >= lines.length - 1) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        const available = heard.slice(used);

        if (available.length === 0) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        let best: { k: number; end: number; similarity: number } | null = null;

        for (
            let k = 0;
            k <= MatchService.WINDOW &&
            current + k < lines.length;
            k++
        ) {
            const lineWords = words(lines[current + k]);

            if (lineWords.length === 0) continue;

            for (const fraction of MatchService.CHECKPOINTS) {
                const checkpoint = Math.max(
                    1,
                    Math.round(lineWords.length * fraction),
                );

                const count = Math.min(
                    MatchService.TAIL,
                    checkpoint,
                    available.length,
                );

                if (
                    count < Math.min(MatchService.MIN_WORDS, checkpoint)
                ) {
                    continue;
                }

                const expected = lineWords
                    .slice(checkpoint - count, checkpoint)
                    .join(" ");

                // Try recent transcript windows, preferring the earliest
                // matching window so subsequent lyric lines remain available.
                for (
                    let start = 0;
                    start + count <= available.length;
                    start++
                ) {
                    const actual = available
                        .slice(start, start + count)
                        .join(" ");

                    const similarity = dice(actual, expected);

                    if (similarity < MatchService.SIMILARITY) {
                        continue;
                    }

                    const end = start + count;

                    if (
                        !best ||
                        end < best.end ||
                        (end === best.end && similarity > best.similarity)
                    ) {
                        best = { k, end, similarity };
                    }
                }
            }
        }

        if (!best) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        return {
            lineIndex: Math.min(
                current + best.k + 1,
                lines.length - 1,
            ),
            // Consume only the words used to confirm this checkpoint.
            offset: used + best.end,
            advanced: true,
        };
    }
}
