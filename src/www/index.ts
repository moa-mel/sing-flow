import { frontendDevOrigin, isProdEnvironment } from "@/config";
import { AllExceptionsFilter } from "@/core/exception/http";
import { classValidatorPipeInstance } from "@/core/pipe";
import { AppModule } from "@/modules";
import { PrismaService } from "@/modules/core/prisma/services";
import { INestApplication, VersioningType } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import morgan from "morgan";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Request, Response } from "express";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


export interface CreateServerOptions {
  port: number;
  production?: boolean;
  whitelistedDomains?: string[];
}

export default async (
  options: CreateServerOptions,
): Promise<INestApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    //logger: false,
  });

  let whitelist = options.whitelistedDomains ?? [];
  if (!isProdEnvironment) {
    whitelist = whitelist.concat(frontendDevOrigin as any);
  }

  const corsOptions: CorsOptions = {
    origin: whitelist,
    allowedHeaders: ['Authorization', 'X-Requested-With', 'Content-Type'],
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };

  app.use(helmet());
  app.enableCors(corsOptions);
  app.use(morgan(options.production ? 'combined' : 'dev'));
  app.useBodyParser('json', { limit: '100mb' });

  const server = app.getHttpAdapter().getInstance();
  server.all('/', (req: Request, res: Response) => res.status(200).send('OK'));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  app.useGlobalPipes(classValidatorPipeInstance());
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Sing Flow API')
    .setDescription('Sing Flow API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen(options.port);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  return app;
}