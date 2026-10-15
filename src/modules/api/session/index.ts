import { Module } from "@nestjs/common";
import { SessionService } from "./services";

@Module({
  imports: [],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule { }