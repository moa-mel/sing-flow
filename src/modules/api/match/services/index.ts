
import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";
import { MatchResultDto } from "../dtos";
import { dice, words } from "@/utils/text";

@Injectable()
export class MatchService {
    constructor(private prisma: PrismaService) {}

    // How many future lines we can search when a line is skipped.
    static readonly WINDOW = 4;

    // Number of opening words used to identify the next line.
    static readonly PREFIX_WORDS = 3;

    // Similarity required for a fuzzy phrase match.
    static readonly SIMILARITY = 0.82;

    advance(
        lines: string[],
        current: number,
        heard: string[],
        offset: number,
    ): MatchResultDto {
        const used = Math.min(
            Math.max(0, offset),
            heard.length,
        );

        if (current >= lines.length - 1) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        const available = heard.slice(used);

        if (available.length < 2) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        let best: {
            k: number;
            end: number;
            similarity: number;
        } | null = null;

        // IMPORTANT:
        // Start at current + 1.
        // We only advance when we hear the beginning of a FUTURE line.
        // Repeating the current line therefore does not advance the display.
        for (
            let k = 1;
            k <= MatchService.WINDOW &&
            current + k < lines.length;
            k++
        ) {
            const lineWords = words(lines[current + k]);

            if (lineWords.length === 0) continue;

            const prefix = lineWords.slice(
                0,
                MatchService.PREFIX_WORDS,
            );

            // A single short word is too ambiguous to identify a line.
            if (
                prefix.length === 1 &&
                prefix[0].length < 5
            ) {
                continue;
            }

            if (available.length < prefix.length) {
                continue;
            }

            // Look for the next line's opening phrase anywhere
            // in the newly unconsumed transcript.
            for (
                let start = 0;
                start + prefix.length <= available.length;
                start++
            ) {
                const heardPhrase = available
                    .slice(start, start + prefix.length);

                let similarity: number;

                if (prefix.length === 1) {
                    similarity =
                        heardPhrase[0] === prefix[0] ? 1 : 0;
                } else {
                    similarity = dice(
                        heardPhrase.join(" "),
                        prefix.join(" "),
                    );
                }

                if (
                    similarity < MatchService.SIMILARITY
                ) {
                    continue;
                }

                const end = start + prefix.length;

                // Prefer the earliest recognized next-line phrase.
                if (
                    !best ||
                    end < best.end ||
                    (
                        end === best.end &&
                        similarity > best.similarity
                    )
                ) {
                    best = {
                        k,
                        end,
                        similarity,
                    };
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
            // The matched future line is now the current line.
            lineIndex: current + best.k,

            // Consume only the matched opening phrase.
            // Remaining words can still identify subsequent lines.
            offset: used + best.end,

            advanced: true,
        };
    }
}
