import { IsBoolean, IsString } from "class-validator";

export class AiResultDto {
    @IsString()
    text!: string;

    @IsBoolean()
    isFinal!: boolean;
}

export interface AiStream {
    send(chunk: Buffer): void;
    close(): void;
}