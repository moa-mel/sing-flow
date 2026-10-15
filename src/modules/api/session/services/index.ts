import { PrismaService } from "@/modules/core/prisma/services";
import { Inject, Injectable } from "@nestjs/common";
import { SessionStateDto } from "../dtos";
import { TTL_SECONDS } from "@/config/constant";
import Redis from "ioredis";
import { REDIS } from "@/modules/core/redis/redis.module";

@Injectable()
export class SessionService {
    constructor(@Inject(REDIS) private readonly redis: Redis) { }

    private key(sessionId: string) {
        return `session:${sessionId}`;
    }

    async get(sessionId: string): Promise<SessionStateDto> {
        const h = await this.redis.hgetall(this.key(sessionId));
        return { songId: h.songId || null, lineIndex: Number(h.lineIndex ?? 0) };
    }

    async set(sessionId: string, state: SessionStateDto): Promise<void> {
        const key = this.key(sessionId);
        await this.redis
            .multi()
            .hset(key, { songId: state.songId ?? '', lineIndex: String(state.lineIndex) })
            .expire(key, TTL_SECONDS)
            .exec();
    }
}