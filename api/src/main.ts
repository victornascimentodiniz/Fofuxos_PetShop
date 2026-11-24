
import { NestFactory } from '@nestjs/core';
import {
  Logger,
  ValidationPipe,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const logger = new Logger('FofuxosAPI');

  // Cabeçalhos de segurança HTTP
  app.use(helmet());

  // Leitura de cookies de autenticação
  app.use(cookieParser());

  // Configuração de acesso do front-end
  app.enableCors({
    origin: configService.getOrThrow<string>(
      'FRONTEND_URL',
    ),
    credentials: true,
  });

  // Prefixo das rotas
  app.setGlobalPrefix('api');

  // Validação das requisições
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Encerramento seguro da aplicação
  app.enableShutdownHooks();

  const port = Number(
    configService.get<string>('PORT') ?? 3001,
  );

  await app.listen(port, '127.0.0.1');

  logger.log(
    `Fofuxos API executando em http://localhost:${port}/api`,
  );
}

void bootstrap();
