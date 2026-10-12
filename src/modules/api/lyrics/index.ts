import { Module } from '@nestjs/common';
import { LyricsGateway } from './gateway/lyrics.gateway';

@Module({
  providers: [
    LyricsGateway
],
})
export class LyricsModule {}