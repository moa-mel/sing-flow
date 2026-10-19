
import { Module } from "@nestjs/common";
import { LyricsGateway } from "./gateway/lyrics.gateway";
import { SessionModule } from "../session";
import { SongModule } from "../songs";
import { MatchModule } from "../match";
import { SearchModule } from "../search";
import { SttModule } from "../stt";
import { SttService } from "../stt/services";

@Module({
  imports: [
    SessionModule,
    SongModule,
    MatchModule,
    SearchModule,
    SttModule,
  ],
  providers: [LyricsGateway, SttService],
})
export class LyricsModule {}
