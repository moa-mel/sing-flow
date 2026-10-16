import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
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
}