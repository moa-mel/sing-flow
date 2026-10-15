import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { SongService } from "../services";
import { SongInputDto } from "../dtos";

@Controller("songs")
export class SongController {
    constructor(private readonly songService: SongService) {}

    @Get()
    listSongs(@Query("q") q?: string) {
        return this.songService.listSongs(q);
    }

    @Get(":id")
    fetchSong(@Param("id") id: string) {
        return this.songService.fetchSongs(id);
    }

    @Post()
    createSong(@Body() input: SongInputDto) {
        return this.songService.createSongs(input);
    }

    @Patch(":id")
    updateSong(
        @Param("id") id: string,
        @Body() input: Partial<SongInputDto>,
    ) {
        return this.songService.updateSongs(id, input);
    }

    @Delete(":id")
    removeSong(@Param("id") id: string) {
        return this.songService.removeSongs(id);
    }
}