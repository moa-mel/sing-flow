import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

import { CACHE_TTL_SECONDS } from "@/config/constant";
import { SongDto, SongListDto } from "../dtos";
import { PrismaService } from "@/modules/core/prisma/services";

@Injectable()
export class SongService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis,
    ) {}

    private cacheKey(id: number): string {
        return `song:${id}`;
    }

    // Fetch all songs from PostgreSQL
    async fetchAllHymn() {
        return this.prisma.song.findMany({
            select: {
                id: true,
                externalId: true,
                title: true,
                author: true,
            },
            orderBy: {
                title: "asc",
            },
        });
    }

    // Fetch a song by its LOCAL database ID
    async fetchHymnById(id: number) {
        const cacheKey = this.cacheKey(id);

        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const song = await this.prisma.song.findUnique({
            where: { id },
            include: {
                lines: {
                    orderBy: {
                        position: "asc",
                    },
                },
            },
        });

        if (!song) {
            throw new NotFoundException("Song not found");
        }

        await this.redis.set(
            cacheKey,
            JSON.stringify(song),
            "EX",
            CACHE_TTL_SECONDS,
        );

        return song;
    }

    // Fetch songs by category
    // Keep using the external API because your current Song model
    // does not store category information.
    async fetchHymnByCategories(categoryId: number) {
        throw new NotFoundException(
            "Category filtering is not yet available for locally stored songs",
        );
    }

    // Existing method used by LyricsGateway
    async fetchSongs(id: number): Promise<SongDto> {
        const song = await this.fetchHymnById(id);

        return {
            id: song.id,
            title: song.title,
            lines: song.lines.map((line) => line.text),
        };
    }

    // Paginated song listing with title filtering
    async listSongs(options: SongListDto) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(options.limit || 20, 100));

        const where = options.title?.trim()
            ? {
                title: {
                    contains: options.title.trim(),
                    mode: "insensitive" as const,
                },
            }
            : {};

        const [songs, total] = await Promise.all([
            this.prisma.song.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    author: true,
                },
                orderBy: {
                    title: "asc",
                },
                skip: (page - 1) * limit,
                take: limit,
            }),

            this.prisma.song.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: songs,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }
}