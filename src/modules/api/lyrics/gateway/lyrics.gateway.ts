import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { JoinBody, Runtime } from "../dtos";
import { SessionService } from "../../session/services";
import { SearchService } from "../../search/services";
import { MatchService } from "../../match/services";
import { SongService } from "../../songs/services";
import { words } from "@/utils/text";
import { SessionStateDto } from "../../session/dtos";
import { SttService } from "../../stt/services";
import { SttResultDto } from "../../stt/dtos";

const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

@WebSocketGateway({
    namespace: "/lyrics",
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(",")
            : true,
    },
    maxHttpBufferSize: 1e6,
})
export class LyricsGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    private server!: Namespace;

    private readonly logger = new Logger(LyricsGateway.name);
    private readonly runtimes = new Map<string, Runtime>();
    private readonly songCache = new Map<
        number,
        Awaited<ReturnType<SongService["fetchSongs"]>>
    >();
    private readonly operatorKey?: string;

    constructor(
        config: ConfigService,
        private readonly sessions: SessionService,
        private readonly songs: SongService,
        private readonly matching: MatchService,
        private readonly search: SearchService,
        private readonly stt: SttService,
    ) {
        this.operatorKey =
            config.get<string>("OPERATOR_KEY") || undefined;
    }

    // Connection

    @SubscribeMessage("session:join")
    async join(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: JoinBody,
    ) {
        const { sessionId, role } = body ?? ({} as JoinBody);

        if (
            !sessionId ||
            (role !== "operator" && role !== "display")
        ) {
            return { ok: false, error: "invalid join" };
        }

        if (
            role === "operator" &&
            this.operatorKey &&
            body.key !== this.operatorKey
        ) {
            return { ok: false, error: "unauthorized" };
        }

        client.data = { sessionId, role };

        await client.join(this.room(sessionId));
        client.emit("state", await this.buildState(sessionId));

        return { ok: true };
    }

    handleDisconnect(client: Socket) {
        const sessionId = client.data?.sessionId as
            | string
            | undefined;

        const runtime = sessionId
            ? this.runtimes.get(sessionId)
            : undefined;

        if (runtime?.ownerSocketId === client.id) {
            this.stopStream(runtime);
        }
    }

    // Audio streaming

    @SubscribeMessage("audio:start")
    startAudio(@ConnectedSocket() client: Socket) {
        const sessionId = this.operatorSession(client);

        if (!sessionId) {
            return { ok: false, error: "unauthorized" };
        }

        const runtime = this.rt(sessionId);

        this.stopStream(runtime);

        runtime.offset = 0;
        runtime.heardLen = 0;
        runtime.ownerSocketId = client.id;

        runtime.stream = this.stt.open(
            (result) => {
                void this.scheduleTranscript(sessionId, result);
            },
            (error) => {
                this.logger.error(`STT error: ${error.message}`);

                this.server
                    .to(this.room(sessionId))
                    .emit("stt:error", {
                        message: error.message,
                    });
            },
        );

        return { ok: true };
    }

    @SubscribeMessage("audio:chunk")
    audioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() chunk: Buffer | ArrayBuffer,
    ) {
        const sessionId = this.operatorSession(client);

        if (!sessionId) return;

        const runtime = this.runtimes.get(sessionId);

        if (runtime?.ownerSocketId !== client.id) return;

        const audio = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

        runtime.stream?.send(audio);
    }

    @SubscribeMessage("audio:stop")
    stopAudio(@ConnectedSocket() client: Socket) {
        const sessionId = this.operatorSession(client);

        if (!sessionId) {
            return { ok: false, error: "unauthorized" };
        }

        this.stopStream(this.rt(sessionId));

        return { ok: true };
    }

    // Manual controls

    @SubscribeMessage("song:select")
    selectSong(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        body: { songId: string | null; lineIndex?: number },
    ) {
        return this.manual(client, (state) => {
            state.songId =
                body?.songId != null && body.songId !== ""
                    ? Number(body.songId)
                    : null;
            state.lineIndex = body?.lineIndex ?? 0;
        });
    }

    @SubscribeMessage("line:set")
    setLine(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { index: number },
    ) {
        return this.manual(client, (state) => {
            state.lineIndex = Number(body?.index) || 0;
        });
    }

    @SubscribeMessage("line:next")
    nextLine(@ConnectedSocket() client: Socket) {
        return this.manual(client, (state) => {
            state.lineIndex += 1;
        });
    }

    @SubscribeMessage("line:prev")
    prevLine(@ConnectedSocket() client: Socket) {
        return this.manual(client, (state) => {
            state.lineIndex -= 1;
        });
    }

    // Transcript matching

    /**
     * Coalesce transcripts: if results arrive faster than we can
     * process them, only the newest one is handled.
     */
    private async scheduleTranscript(
        sessionId: string,
        result: SttResultDto,
    ) {
        const runtime = this.rt(sessionId);

        // Never overwrite a pending final with an interim
        // (finals reset the offset).
        if (!runtime.pending?.isFinal || result.isFinal) {
            runtime.pending = result;
        }

        if (runtime.draining) return;
        runtime.draining = true;

        try {
            while (runtime.pending) {
                const next = runtime.pending;
                runtime.pending = undefined;

                await this.enqueue(sessionId, () =>
                    this.onTranscript(sessionId, next),
                );
            }
        } catch (error) {
            this.logger.error(
                `Transcript handling failed: ${error instanceof Error
                    ? error.message
                    : String(error)
                }`,
            );
        } finally {
            runtime.draining = false;
        }
    }

    private async onTranscript(
        sessionId: string,
        result: SttResultDto,
    ) {
        const runtime = this.rt(sessionId);
        const room = this.room(sessionId);

        this.server.to(room).emit("transcript", result);

        const heard = words(result.text);
        this.logger.debug(
            `[${result.isFinal ? "FINAL" : "interim"}] heard=${heard.length} offset=${runtime.offset} line=${(await this.getState(sessionId)).lineIndex} :: ${result.text}`,
        );
        runtime.heardLen = heard.length;

        // Work on a copy so the cache is only updated via saveState.
        const state = { ...(await this.getState(sessionId)) };
        let changed = false;

        if (!state.songId) {
            // Identify the song when no song is selected.
            const searchResult = await this.search.search(heard);
            const hit = searchResult.autoLoad;
            const song = hit
                ? await this.getSong(hit.songId)
                : undefined;

            if (hit && song) {
                state.songId = hit.songId;
                state.lineIndex = clamp(
                    hit.lineIndex + 1,
                    0,
                    Math.max(0, song.lines.length - 1),
                );

                runtime.offset = heard.length;
                changed = true;
            } else if (
                result.isFinal &&
                searchResult.hits.length > 0
            ) {
                this.server
                    .to(room)
                    .emit("search:suggestions", searchResult.hits);
            }
        } else {
            // Advance through the currently selected song.
            const song = await this.getSong(state.songId);

            if (song) {
                const match = this.matching.advance(
                    song.lines,
                    state.lineIndex,
                    heard,
                    runtime.offset,
                );

                runtime.offset = match.offset;

                if (match.advanced) {
                    state.lineIndex = match.lineIndex;
                    changed = true;
                }
            }
        }

        if (result.isFinal) {
            // the next utterance starts with a fresh transcript
            runtime.offset = 0;
            runtime.heardLen = 0;
        }

        if (changed) {
            this.saveState(sessionId, state);
            await this.broadcastState(sessionId);
        }
    }

    // Helpers

    private manual(
        client: Socket,
        mutate: (state: SessionStateDto) => void,
    ) {
        const sessionId = this.operatorSession(client);

        if (!sessionId) {
            return Promise.resolve({
                ok: false,
                error: "unauthorized",
            });
        }

        return this.enqueue(sessionId, async () => {
            // Copy so a failed command doesn't corrupt the cached state.
            const state = { ...(await this.getState(sessionId)) };

            mutate(state);

            const song = state.songId
                ? await this.getSong(state.songId)
                : undefined;

            if (state.songId && !song) {
                return { ok: false, error: "unknown song" };
            }

            state.lineIndex = song
                ? clamp(
                    state.lineIndex,
                    0,
                    Math.max(0, song.lines.length - 1),
                )
                : 0;

            this.saveState(sessionId, state);

            const runtime = this.rt(sessionId);

            // Ignore words already heard after manual navigation.
            runtime.offset = runtime.heardLen;

            await this.broadcastState(sessionId);

            return { ok: true };
        });
    }

    /**
     * Serialize tasks per session so transcript processing and
     * manual commands do not interfere with one another.
     */
    private enqueue<T>(
        sessionId: string,
        task: () => Promise<T>,
    ): Promise<T> {
        const runtime = this.rt(sessionId);
        const run = runtime.queue.then(task);

        runtime.queue = run.catch(() => undefined);

        return run;
    }

    private rt(sessionId: string): Runtime {
        let runtime = this.runtimes.get(sessionId);

        if (!runtime) {
            runtime = {
                offset: 0,
                heardLen: 0,
                queue: Promise.resolve(),
            };

            this.runtimes.set(sessionId, runtime);
        }

        return runtime;
    }

    private async getSong(id: number) {
        let song = this.songCache.get(id);

        if (!song) {
            song = await this.songs.fetchSongs(id);
            if (song) this.songCache.set(id, song);
        }

        return song;
    }

    private async getState(sessionId: string) {
        const runtime = this.rt(sessionId);

        if (!runtime.state) {
            runtime.state = await this.sessions.get(sessionId);
        }

        return runtime.state;
    }

    private saveState(sessionId: string, state: SessionStateDto) {
        this.rt(sessionId).state = state;

        // Persist in the background; don't block the broadcast.
        void this.sessions
            .set(sessionId, state)
            .catch((e: unknown) =>
                this.logger.error(
                    `Persist failed: ${e instanceof Error ? e.message : String(e)
                    }`,
                ),
            );
    }

    private stopStream(runtime: Runtime) {
        runtime.stream?.close();
        runtime.stream = undefined;
        runtime.ownerSocketId = undefined;
        runtime.pending = undefined;
    }

    private operatorSession(client: Socket): string | null {
        return client.data?.role === "operator"
            ? (client.data.sessionId as string)
            : null;
    }

    private room(sessionId: string): string {
        return `session:${sessionId}`;
    }

    private async buildState(sessionId: string) {
        const state = await this.getState(sessionId);

        const song = state.songId
            ? await this.getSong(state.songId)
            : undefined;

        return {
            songId: state.songId,
            lineIndex: state.lineIndex,
            song: song ?? null,
        };
    }

    private async broadcastState(sessionId: string) {
        this.server
            .to(this.room(sessionId))
            .emit("state", await this.buildState(sessionId));
    }
}