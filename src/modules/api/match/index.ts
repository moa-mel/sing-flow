import { Module } from "@nestjs/common";
import { MatchService } from "./services";

@Module({
  imports: [],
  providers: [MatchService],
  exports: [MatchService], 
})
export class MatchModule {}