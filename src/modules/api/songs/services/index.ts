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

    async createSongs(input: SongInputDto): Promise<SongDto> {
        const song = await this.prisma.song.create({
            data: {
                title: input.title,
                author: input.author ?? null,
                lines: {
                    create: this.toLines(input.lyrics),
                },
            },
            select: { id: true },
        });

        return this.fetchSongs(song.id);
    }

    async updateSongs(
        id: number,
        input: Partial<SongInputDto>,
    ): Promise<SongDto> {
        const existing = await this.prisma.song.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException("Song not found");
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.song.update({
                where: { id },
                data: {
                    ...(input.title !== undefined && {
                        title: input.title,
                    }),
                    ...(input.author !== undefined && {
                        author: input.author,
                    }),
                },
            });

            if (input.lyrics !== undefined) {
                await tx.line.deleteMany({
                    where: { songId: id },
                });

                const lines = this.toLines(input.lyrics);

                if (lines.length > 0) {
                    await tx.line.createMany({
                        data: lines.map((line) => ({
                            ...line,
                            songId: id,
                        })),
                    });
                }
            }
        });

        await this.redis.del(this.cacheKey(id));

        return this.fetchSongs(id);
    }

    async removeSongs(id: number): Promise<void> {
        const existing = await this.prisma.song.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException("Song not found");
        }

        await this.prisma.song.delete({ where: { id } });
        await this.redis.del(this.cacheKey(id));
    }
}