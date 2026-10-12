import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SessionService {
    constructor(
        private prisma: PrismaService,
    ) { }

}