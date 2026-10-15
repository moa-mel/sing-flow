import { Module } from "@nestjs/common";
import { AiModule } from "./ai";
import { SearchModule } from "./search";
import { SongModule } from "./songs";
import { SessionModule } from "./session";
import { LyricsModule } from "./lyrics";
import { MatchModule } from "./match";

@Module({
  imports: [
    AiModule,
    LyricsModule,
    MatchModule,
    SearchModule,
    SessionModule,
    SongModule
  ],
})
export class ApiModule {}