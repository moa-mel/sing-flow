import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/modules/core/prisma/services";
import { normalize } from "@/utils/text";
import { SongDto, SongInputDto, SongListDto } from "../dtos";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { CACHE_TTL_SECONDS } from "@/config/constant";

@Injectable()
export class SongService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis,
    ) { }

    private cacheKey(id: number): string {
        return `song:${id}`;
    }

    private toLines(lyrics: string) {
        return lyrics
            .split(/\r?\n/)
            .map((text) => text.trim())
            .filter((text) => normalize(text).length > 0)
            .map((text, position) => ({
                position,
                text,
                normalized: normalize(text),
            }));
    }

    async fetchSongs(id: number): Promise<SongDto> {
        const cached = await this.redis.get(this.cacheKey(id));

        if (cached) {
            return JSON.parse(cached) as SongDto;
        }

        const song = await this.prisma.song.findUnique({
            where: { id },
            include: {
                lines: { orderBy: { position: "asc" } },
            },
        });

        if (!song) {
            throw new NotFoundException("Song not found");
        }

        const result: SongDto = {
            id: song.id,
            title: song.title,
            lines: song.lines.map((line) => line.text),
        };

        await this.redis.set(
            this.cacheKey(id),
            JSON.stringify(result),
            "EX",
            CACHE_TTL_SECONDS,
        );

        return result;
    }

    async listSongs(options: SongListDto) {
        return this.prisma.song.findMany({
            where: options.title
                ? { title: { contains: options.title, mode: "insensitive" } }
                : undefined,
            select: {
                id: true,
                title: true,
                author: true,
            },
            orderBy: { title: "asc" },
        });
    }
}