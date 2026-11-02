import { Injectable } from "@nestjs/common";

export interface MatchResult {
    lineIndex: number;
    offset: number;
    advanced: boolean;
    similarity?: number;
    matchedLine?: number;
    consumedWords?: number;
}

@Injectable()
export class MatchService {
    private static readonly TAIL = 4;
    private static readonly MIN_WORDS = 3;
    private static readonly SIMILARITY = 0.6;

    /**
     * Advances at most one line per call.
     *
     * `offset` points to the first unconsumed word in `heard`.
     * The matcher compares only the latest words against the end
     * of the current lyric line.
     */
    advance(
        lines: string[],
        current: number,
        heard: string[],
        offset: number,
    ): MatchResult {
        const lastLine = lines.length - 1;

        if (current >= lastLine) {
            return {
                lineIndex: current,
                offset: Math.min(offset, heard.length),
                advanced: false,
            };
        }

        const used = Math.min(offset, heard.length);
        const available = heard.length - used;

        if (available < MatchService.MIN_WORDS) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        const currentLineWords = this.words(lines[current] ?? "");

        if (currentLineWords.length < MatchService.MIN_WORDS) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        // Require a match against the actual end of the current line.
        const expected = currentLineWords.slice(-MatchService.TAIL);
        const recent = heard.slice(Math.max(used, heard.length - expected.length));

        const similarity = this.dice(
            recent.join(" "),
            expected.join(" "),
        );

        if (similarity < MatchService.SIMILARITY) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
                similarity,
                matchedLine: current,
                consumedWords: 0,
            };
        }

        return {
            lineIndex: Math.min(current + 1, lastLine),
            // Consume the transcript currently available so it cannot
            // trigger another advance until new words arrive.
            offset: heard.length,
            advanced: true,
            similarity,
            matchedLine: current,
            consumedWords: available,
        };
    }

    private words(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[’']/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(Boolean);
    }

    /**
     * Sørensen–Dice similarity over word bigrams.
     * Handles small speech-recognition differences without relying
     * on an exact string match.
     */
    private dice(a: string, b: string): number {
        const aWords = this.words(a);
        const bWords = this.words(b);

        if (aWords.length === 0 || bWords.length === 0) {
            return 0;
        }

        if (aWords.length === 1 || bWords.length === 1) {
            return aWords[0] === bWords[0] ? 1 : 0;
        }

        const bigrams = (words: string[]) => {
            const result = new Map<string, number>();

            for (let i = 0; i < words.length - 1; i++) {
                const pair = `${words[i]} ${words[i + 1]}`;
                result.set(pair, (result.get(pair) ?? 0) + 1);
            }

            return result;
        };

        const aBigrams = bigrams(aWords);
        const bBigrams = bigrams(bWords);

        let intersection = 0;

        for (const [pair, count] of aBigrams) {
            intersection += Math.min(count, bBigrams.get(pair) ?? 0);
        }

        const total = [...aBigrams.values()].reduce((sum, n) => sum + n, 0)
            + [...bBigrams.values()].reduce((sum, n) => sum + n, 0);

        return total === 0 ? 0 : (2 * intersection) / total;
    }
}