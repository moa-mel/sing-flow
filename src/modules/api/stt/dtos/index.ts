import { IsBoolean, IsString } from "class-validator";

export class SttResultDto {
    @IsString()
    text!: string;

    @IsBoolean()
    isFinal!: boolean;
}

export interface SttStream {
    send(chunk: Buffer): void;
    close(): void;
}