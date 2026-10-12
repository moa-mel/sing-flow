import { Module } from "@nestjs/common";
import { SearchService } from "./services";

@Module({
  imports: [],
  providers: [SearchService],
})
export class SearchModule {}