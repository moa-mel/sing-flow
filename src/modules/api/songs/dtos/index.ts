import {
    IsArray,
    IsOptional,
    IsString,
} from "class-validator";

export class SongDto {
    @IsString()
    id!: string;

    @IsString()
    title!: string;

    @IsArray()
    @IsString({ each: true })
    lines!: string[];
}

export class SongInputDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    author?: string | null;

    @IsString()
    lyrics!: string;
}