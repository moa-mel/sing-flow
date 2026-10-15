import { Module } from "@nestjs/common";
import { AiService } from "./services";

@Module({
  imports: [],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}