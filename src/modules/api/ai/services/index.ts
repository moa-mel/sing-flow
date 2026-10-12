import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AiService {
    constructor(
        private prisma: PrismaService,
    ) { }

}