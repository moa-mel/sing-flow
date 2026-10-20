import { IsIn, IsOptional, IsString } from "class-validator";
import { SttResultDto } from "../../stt/dtos";
import { SessionStateDto } from "../../session/dtos";

export type Role = "operator" | "display";

export class JoinBody {
    @IsString()
    sessionId!: string;

    @IsIn(["operator", "display"])
    role!: Role;

    @IsOptional()
    @IsString()
    key?: string;
}

export interface Runtime {
    stream?: {
        send(chunk: Buffer): void;
        close(): void;
    };
    ownerSocketId?: string;
    offset: number;
    queue: Promise<unknown>;
    state?: SessionStateDto;
    draining?: boolean;
    utter?: string[];   // rolling buffer of recent words
    last?: string[];    // previous raw result, used to detect cumulative text
    dirty?: boolean;
    final?: boolean;
    holdUntil?: number; // ms timestamp; ignore matching until then
    touchedAt?: number; // last time the position changed
}

