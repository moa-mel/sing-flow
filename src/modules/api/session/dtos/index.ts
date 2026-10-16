import { IsNumber, IsString } from "class-validator";

export class SessionStateDto {
    @IsNumber()
    songId: number | null;

    @IsNumber()
    lineIndex: number;
}