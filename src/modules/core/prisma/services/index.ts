import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import logger from 'moment-logger';
import { Pool } from "pg";


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
   constructor() {
    // Create a PostgreSQL connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Create the Prisma adapter
    const adapter = new PrismaPg(pool);

    // Initialize PrismaClient with the adapter
    super({
      adapter,
    });
  }

  async onModuleInit() {
    try {
      logger.log('Connecting to the database...');
      await this.$connect();
      logger.info('Connected to the database');
      
      // Test the connection with a simple query
      await this.$queryRaw`SELECT 1`;
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Failed to connect to the database:', error);
      throw error;
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      logger.warn('Prisma detected beforeExit – closing NestJS app...');
      await app.close();
    });
  }
}