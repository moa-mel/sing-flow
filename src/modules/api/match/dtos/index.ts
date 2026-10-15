import { IsBoolean, IsNumber } from "class-validator";

export class MatchResultDto {
  @IsNumber()
  lineIndex: number;

  @IsNumber()
  offset: number;

  @IsBoolean()
  advanced: boolean;
}





