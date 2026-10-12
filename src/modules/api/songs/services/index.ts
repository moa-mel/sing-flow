import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SongService {
    constructor(
        private prisma: PrismaService,
    ) { }

}