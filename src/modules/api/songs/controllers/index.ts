import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { SongService } from "../services";
import { SongInputDto, SongListDto } from "../dtos";

@Controller("songs")
export class SongController {
    constructor(private readonly songService: SongService) {}

    @Get()
    listSongs(@Query("dto") dto: SongListDto) {
        return this.songService.listSongs(dto);
    }

    @Get(":id")
    fetchSong(@Param("id", ParseIntPipe) id: number) {
        return this.songService.fetchSongs(id);
    }

}