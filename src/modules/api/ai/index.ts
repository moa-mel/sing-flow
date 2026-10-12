import { Module } from "@nestjs/common";
import { AiService } from "./services";

@Module({
  imports: [],
  providers: [AiService],
})
export class AiModule {}