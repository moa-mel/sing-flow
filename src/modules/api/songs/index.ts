import { Module } from "@nestjs/common";
import { SongController } from "./controllers";
import { SongService } from "./services";

@Module({
  imports: [],
  providers: [SongService],
  exports: [SongService],
  controllers: [SongController],
})
export class SongModule {}