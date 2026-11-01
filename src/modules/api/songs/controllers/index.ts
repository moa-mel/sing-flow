import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
} from "@nestjs/common";

import { SongService } from "../services";
import { SongListDto } from "../dtos";

@Controller("songs")
export class SongController {
    constructor(private readonly songService: SongService) {}

    // Fetch all hymns
    @Get("hymns")
    fetchAllHymn() {
        return this.songService.fetchAllHymn();
    }

    // Fetch hymn by ID
    @Get("hymns/:id")
    fetchHymnById(@Param("id", ParseIntPipe) id: number) {
        return this.songService.fetchHymnById(id);
    }

    // Fetch hymns by category
    @Get("hymns/category/:categoryId")
    fetchHymnByCategory(@Param("categoryId", ParseIntPipe) categoryId: number,
    ) {
        return this.songService.fetchHymnByCategories(categoryId);
    }

    // List songs with optional title filtering
    @Get()
    listSongs(@Query() query: SongListDto) {
        return this.songService.listSongs(query);
    }

    // Fetch song lyrics by ID (used by LyricsGateway)
    @Get(":id")
    fetchSong(@Param("id", ParseIntPipe) id: number) {
        return this.songService.fetchSongs(id);
    }
}
