import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SearchService {
    constructor(
        private prisma: PrismaService,
    ) { }

}