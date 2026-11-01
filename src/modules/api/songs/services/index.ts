import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

import { CACHE_TTL_SECONDS } from "@/config/constant";
import { normalize } from "@/utils/text";
import { SongDto, SongListDto } from "../dtos";
import { HymnLib } from "@/lib/hymn";
import { ExternalHymn } from "@/lib/hymn/interfaces";
import { hymnBaseUrl } from "@/config";

@Injectable()
export class SongService {
    private readonly hymnLib: HymnLib;

    constructor(
        @InjectRedis() private readonly redis: Redis,
    ) {
        this.hymnLib = new HymnLib({
            baseUrl: hymnBaseUrl,
        });
    }

    private cacheKey(id: number): string {
        return `song:${id}`;
    }

    private getLines(lyrics: ExternalHymn["Lyrics"]): string[] {
        if (!lyrics) return [];

        return lyrics.flatMap((verse) =>
            verse.text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => normalize(line).length > 0),
        );
    }

    // Fetch all hymns
    async fetchAllHymn() {
        return this.hymnLib.fetchAllHymn();
    }

    // Fetch hymn by ID
    async fetchHymnById(id: number) {
        const cacheKey = this.cacheKey(id);

        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const hymn = (await this.hymnLib.fetchHymnById(
            id,
        )) as ExternalHymn;

        if (!hymn || !hymn.ID) {
            throw new NotFoundException("Hymn not found");
        }

        await this.redis.set(
            cacheKey,
            JSON.stringify(hymn),
            "EX",
            CACHE_TTL_SECONDS,
        );

        return hymn;
    }

    // Fetch hymns by category
    async fetchHymnByCategories(categoryId: number) {
        const cacheKey = `hymns:category:${categoryId}`;

        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const hymns = await this.hymnLib.fetchHymnByCategories(categoryId);

        await this.redis.set(
            cacheKey,
            JSON.stringify(hymns),
            "EX",
            CACHE_TTL_SECONDS,
        );

        return hymns;
    }

    // Existing method used by LyricsGateway
    async fetchSongs(id: number): Promise<SongDto> {
        const hymn = (await this.fetchHymnById(id)) as ExternalHymn;

        return {
            id: hymn.ID,
            title: hymn.Title,
            lines: this.getLines(hymn.Lyrics),
        };
    }

    // Existing song listing with title filtering
    // Paginated song listing with title filtering
    async listSongs(options: SongListDto) {
        const hymns = (await this.fetchAllHymn()) as ExternalHymn[];

        // Filter by title
        const filteredHymns = options.title
            ? hymns.filter((hymn) =>
                hymn.Title?.toLowerCase().includes(
                    options.title!.trim().toLowerCase(),
                ),
            )
            : hymns;

        // Format and sort songs
        const songs = filteredHymns
            .map((hymn) => ({
                id: hymn.ID,
                title: hymn.Title,
                author: hymn.Author ?? null,
            }))
            .sort((a, b) => a.title.localeCompare(b.title));

        // Pagination
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(options.limit || 20, 100));

        const total = songs.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;

        const data = songs.slice(startIndex, startIndex + limit);

        return {
            data,
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