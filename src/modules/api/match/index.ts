import { Module } from "@nestjs/common";
import { MatchService } from "./services";

@Module({
  imports: [],
  providers: [MatchService],
})
export class MatchModule {}