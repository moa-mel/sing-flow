import { Module } from "@nestjs/common";
import { SearchModule } from "./search";
import { SongModule } from "./songs";
import { SessionModule } from "./session";
import { LyricsModule } from "./lyrics";
import { MatchModule } from "./match";
import { SttModule } from "./stt";

@Module({
  imports: [
    SttModule,
    LyricsModule,
    MatchModule,
    SearchModule,
    SessionModule,
    SongModule
  ],
})
export class ApiModule {}