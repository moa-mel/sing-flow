import { Module } from "@nestjs/common";
import { SttService } from "./services";

@Module({
  imports: [],
  providers: [SttService],
  exports: [SttService],
})
export class SttModule {}