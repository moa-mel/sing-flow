import { Module } from "@nestjs/common";
import { SearchService } from "./services";

@Module({
  imports: [],
  providers: [SearchService],
  exports: [SearchService], 
})
export class SearchModule {}