import { IsIn, IsOptional, IsString } from "class-validator";

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
    heardLen: number;
    queue: Promise<unknown>;
}