
import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";
import { MatchResultDto } from "../dtos";
import { dice, words } from "@/utils/text";

@Injectable()
export class MatchService {
    constructor(private prisma: PrismaService) {}

    static readonly TAIL = 4;
    static readonly SIMILARITY = 0.75;
    static readonly MIN_WORDS = 3;

    /**
     * Only advance when the beginning of the NEXT line
     * is recognised in the correct order.
     *
     * Repeated words from later stanzas cannot cause jumps.
     */
    advance(
        lines: string[],
        current: number,
        heard: string[],
        offset: number,
    ): MatchResultDto {
        const used = Math.min(offset, heard.length);

        if (current >= lines.length - 1) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        const available = heard.length - used;

        if (available < MatchService.MIN_WORDS) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        // Only consider the immediately following line.
        const nextWords = words(lines[current + 1]);

        if (nextWords.length < MatchService.MIN_WORDS) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        const maxWords = Math.min(
            MatchService.TAIL,
            available,
            nextWords.length,
        );

        let matched = false;

        // Require at least three words matching the beginning
        // of the next line, in the correct order.
        for (
            let count = maxWords;
            count >= MatchService.MIN_WORDS;
            count--
        ) {
            const heardTail = heard
                .slice(heard.length - count)
                .join(" ");

            const nextLinePrefix = nextWords
                .slice(0, count)
                .join(" ");

            const similarity = dice(heardTail, nextLinePrefix);

            if (similarity >= MatchService.SIMILARITY) {
                matched = true;
                break;
            }
        }

        if (!matched) {
            return {
                lineIndex: current,
                offset: used,
                advanced: false,
            };
        }

        return {
            lineIndex: current + 1,
            offset: heard.length,
            advanced: true,
        };
    }
}
