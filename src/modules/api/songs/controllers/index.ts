import { Controller } from "@nestjs/common";
import { SongService } from "../services";

@Controller({
    path: 'songs',
})
export class SongController {
    constructor(private readonly songService: SongService) { }
}