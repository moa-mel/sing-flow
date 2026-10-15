import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchHitDto {
    @IsString()
    songId!: string;

    @IsString()
    title!: string;

    /** The line that was just heard. */
    @IsNumber()
    lineIndex!: number;

    @IsNumber()
    score!: number;

    /** Words of that line not yet heard. */
    @IsNumber()
    remaining!: number;
}

export class SearchResultDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SearchHitDto)
    hits!: SearchHitDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => SearchHitDto)
    autoLoad!: SearchHitDto | null;
}

export interface Candidate {
    songId: string;
    title: string;
    position: number;
    normalized: string;
}