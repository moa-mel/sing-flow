import { Module } from "@nestjs/common";
import { AiModule } from "./ai";
import { SearchModule } from "./search";
import { SongsModule } from "./songs";
import { SessionModule } from "./session";
import { LyricsModule } from "./lyrics";

@Module({
  imports: [
    AiModule,
    LyricsModule,
    SearchModule,
    SessionModule,
    SongsModule
  ],
})
export class ApiModule {}