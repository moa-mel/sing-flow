import { IsNumber, IsString } from "class-validator";

export class SessionStateDto {
    @IsString()
    songId: string | null;

    @IsNumber()
    lineIndex: number;
}