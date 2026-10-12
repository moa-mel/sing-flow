import { Module } from "@nestjs/common";
import { AiModule } from "./ai";
import { SearchModule } from "./search";
import { SongModule } from "./songs";
import { SessionModule } from "./session";
import { LyricsModule } from "./lyrics";

@Module({
  imports: [
    AiModule,
    LyricsModule,
    SearchModule,
    SessionModule,
    SongModule
  ],
})
export class ApiModule {}