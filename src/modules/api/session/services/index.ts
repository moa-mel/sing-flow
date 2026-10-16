import { Injectable } from "@nestjs/common";
import { SessionStateDto } from "../dtos";
import { TTL_SECONDS } from "@/config/constant";
import Redis from "ioredis";
import { InjectRedis } from "@nestjs-modules/ioredis";

@Injectable()
export class SessionService {
    constructor(@InjectRedis() private readonly redis: Redis) { }

    private key(sessionId: string) {
        return `session:${sessionId}`;
    }

    async get(sessionId: string): Promise<SessionStateDto> {
        const h = await this.redis.hgetall(this.key(sessionId));
        return {
            songId: h.songId != null && h.songId !== ""
                ? Number(h.songId)
                : null,
            lineIndex: Number(h.lineIndex ?? 0),
        };
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