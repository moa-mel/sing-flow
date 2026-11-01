import { Type } from "class-transformer";
import {
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export class SongDto {
    @IsNumber()
    @IsOptional()
    id: number;

    @IsString()
    @IsOptional()
    title: string;

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    lines: string[];
}

export class SongInputDto {
    @IsString()
    @IsOptional()
    title: string;

    @IsOptional()
    @IsString()
    author?: string | null;

    @IsString()
    @IsOptional()
    lyrics: string;
}

export class SongListDto {
    @IsString()
    @IsOptional()
    title: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 20;
}