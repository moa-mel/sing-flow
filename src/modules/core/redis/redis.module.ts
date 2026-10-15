import { RedisModule } from "@nestjs-modules/ioredis";
import { Global, Module } from "@nestjs/common";
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from "@nestjs/config";

const logger = new Logger('RedisIntegration');


export const REDIS = Symbol('REDIS');

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        return {
          type: 'single',
          url,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class RedisIntegrationModule {}