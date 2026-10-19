import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { SttResultDto, SttStream } from '../dtos';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);

  constructor(private readonly config: ConfigService) {}

  open(
    onResult: (r: SttResultDto) => void,
    onError: (e: Error) => void,
  ): SttStream {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      queueMicrotask(() =>
        onError(new Error('GEMINI_API_KEY is not set')),
      );
      return { send: () => undefined, close: () => undefined };
    }

    const model =
      this.config.get<string>('GEMINI_STT_MODEL') ??
      'gemini-3.5-transcribe-live';

    // Optional: e.g. "en-US" — empty = auto language detect
    const lang = this.config.get<string>('GEMINI_LANGUAGE');
    const languageCodes = lang ? [lang] : [];

    const url =
      `wss://generativelanguage.googleapis.com/ws/` +
      `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` +
      `?key=${apiKey}`;

    const ws = new WebSocket(url);

    let closed = false;
    let setupDone = false;
    const pending: Buffer[] = [];

    const sendAudio = (chunk: Buffer) => {
      if (closed || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: chunk.toString('base64'),
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        }),
      );
    };

    ws.on('open', () => {
      // First message must be setup
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ['TEXT'],
            },
            inputAudioTranscription: {
              languageCodes,
              // mode: 'SMART', // optional: cleaner text (filler words removed)
            },
          },
        }),
      );
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Setup complete — flush buffered chunks
        if (msg.setupComplete !== undefined) {
          setupDone = true;
          for (const chunk of pending.splice(0)) sendAudio(chunk);
          return;
        }

        const content = msg.serverContent;
        if (!content) return;

        // Interim (partial) — good for live UI + early line match
        const interim =
          content.interimInputTranscription?.text ??
          content.interim_input_transcription?.text;
        if (interim) {
          onResult({ text: interim, isFinal: false });
        }

        // Finalized segment
        const final =
          content.inputTranscription?.text ??
          content.input_transcription?.text;
        if (final) {
          onResult({ text: final, isFinal: true });
        }
      } catch (e) {
        this.logger.warn(
          `Bad Gemini message: ${(e as Error).message}`,
        );
      }
    });

    ws.on('error', (e) => {
      if (!closed) onError(e);
    });

    ws.on('close', () => {
      closed = true;
    });

    return {
      send: (chunk: Buffer) => {
        if (closed) return;
        if (setupDone && ws.readyState === WebSocket.OPEN) {
          sendAudio(chunk);
        } else if (pending.length < 100) {
          pending.push(chunk);
        }
      },
      close: () => {
        closed = true;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                realtimeInput: { audioStreamEnd: true },
              }),
            );
          } catch {
            /* ignore */
          }
          ws.close();
        } else {
          ws.terminate();
        }
      },
    };
  }
}