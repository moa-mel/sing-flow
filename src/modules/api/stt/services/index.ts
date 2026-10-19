import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import WebSocket from 'ws';
import { SttResultDto, SttStream } from "../dtos";

@Injectable()
export class SttService {

    private readonly logger = new Logger(SttService.name);

    constructor(private readonly config: ConfigService) { }

    open(onResult: (r: SttResultDto) => void, onError: (e: Error) => void): SttStream {
        const apiKey = this.config.get<string>('DEEPGRAM_API_KEY');
        if (!apiKey) {
            queueMicrotask(() => onError(new Error('DEEPGRAM_API_KEY is not set')));
            return { send: () => undefined, close: () => undefined };
        }

        const params = new URLSearchParams({
            model: 'nova-2',
            language: this.config.get<string>('DEEPGRAM_LANGUAGE') ?? 'en',
            encoding: 'linear16',
            sample_rate: '16000',
            channels: '1',
            interim_results: 'true',
            punctuate: 'false',
            endpointing: '400',
        });

        const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
            headers: { Authorization: `Token ${apiKey}` },
        });

        let closed = false;
        const pending: Buffer[] = [];

        // Deepgram drops idle connections after ~10s; keep it alive between songs.
        const keepAlive = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }, 5000);

        ws.on('open', () => {
            for (const chunk of pending.splice(0)) ws.send(chunk);
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type !== 'Results') return;
                const text: string = msg.channel?.alternatives?.[0]?.transcript ?? '';
                if (text) onResult({ text, isFinal: Boolean(msg.is_final) });
            } catch (e) {
                this.logger.warn(`Bad AI message: ${(e as Error).message}`);
            }
        });

        ws.on('error', (e) => {
            if (!closed) onError(e);
        });
        ws.on('close', () => clearInterval(keepAlive));

        return {
            send: (chunk) => {
                if (closed) return;
                if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
                else if (pending.length < 100) pending.push(chunk);
            },
            close: () => {
                closed = true;
                clearInterval(keepAlive);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'CloseStream' }));
                    ws.close();
                } else {
                    ws.terminate();
                }
            },
        };
    }

}