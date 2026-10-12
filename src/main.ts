import logger from 'moment-logger';
import Redis from 'ioredis';
import createServer, { CreateServerOptions } from '@/www';
import { port, isProduction, allowedDomains } from '@/config';

async function bootstrap() {
  try {
    // Start Server
    logger.log('Starting Server');
    logger.info(
      `Running in ${isProduction ? 'production' : 'development'} mode`,
    );

    const options: CreateServerOptions = {
      port,
      production: isProduction,
      whitelistedDomains: allowedDomains,
    };

    await createServer(options);

    // Build the connection options object
    const redisOptions: any = {
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('Redis connection failed permanently after 10 attempts.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Retrying Redis connection in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        logger.error('Redis connection error:', err.message);
        return true; 
      }
    };

    // Safely append TLS if required by your cloud provider (like Render/Railway)
    if (process.env.REDIS_TLS === 'true') {
      redisOptions.tls = {
        rejectUnauthorized: false
      };
    }

    // Initialize Redis using the URL and your dynamic options payload
    const redis = new Redis(process.env.REDIS_URL!, redisOptions);

    // Log Redis connection status
    redis.on('connect', () => {
      logger.info('Connected to Redis server');
      console.log('✅ Redis OK');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err.message);
      console.error('❌ Redis FAIL:', err.message);
    });

    logger.info(`Server started on port ${port}`);
  } catch (error) {
    logger.error(error);
  }
}
bootstrap();