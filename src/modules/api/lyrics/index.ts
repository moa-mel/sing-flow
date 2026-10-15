
import { Module } from "@nestjs/common";
import { LyricsGateway } from "./gateway/lyrics.gateway";
import { SessionModule } from "../session";
import { SongModule } from "../songs";
import { MatchModule } from "../match";
import { SearchModule } from "../search";
import { AiModule } from "../ai";
import { AiService } from "../ai/services";

@Module({
  imports: [
    SessionModule,
    SongModule,
    MatchModule,
    SearchModule,
    AiModule,
  ],
  providers: [LyricsGateway, AiService],
})
export class LyricsModule {}
