import { Module } from "@nestjs/common";
import { PrismaModule } from "./core/prisma";
import { RedisIntegrationModule } from "./core/redis/redis.module";
import { ApiModule } from "./api";

@Module({
  imports: [ ApiModule, PrismaModule, RedisIntegrationModule,],
})
export class AppModule {}