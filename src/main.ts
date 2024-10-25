import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';
import fastifySession from 'fastify-session';
import fastifyCookie from '@fastify/cookie';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SocketAdapter } from './adapters/socket.adapter';
import kysely from 'kysely.config';
import { ValidationPipe } from '@nestjs/common';
const RedisStore = require('connect-redis').default;
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const store = new RedisStore({
    client: new Redis({
      enableAutoPipelining: true
    })
  });

  await app.register(fastifyCookie);

  const oneMonthInMilliseconds = 1 * 30 * 24 * 60 * 60 * 1000;
  await app.register(fastifySession, {
    store,
    secret: process.env.COOKIES_SECRET,
    cookie: {
      secure: process.env.SECURE_COOKIES === 'true',  // У продакшені має бути true
      httpOnly: true,
      maxAge: oneMonthInMilliseconds,
    },
  });

  app.use(
    cors({
      origin: ['http://localhost:5173', 'https://chess.levych.com', 'https://levych.com', process.env.BASE_WEB_APP_URL],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    }),
  );
  app.enableCors({
    credentials: true,
    origin: ['http://localhost:5173', 'https://chess.levych.com', 'https://levych.com', process.env.BASE_WEB_APP_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Налаштування CORS для Socket.IO
  app.useWebSocketAdapter(new SocketAdapter(app));

  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true, transform: true }));

  await app.listen({ port: Number(process.env.PORT) });
  console.log(`🟢 Application is running on: ${await app.getUrl()}`);

  kysely.migrator.migrateToLatest().then((c) => {
    if (c.results?.length) {
      console.info('🟢', c.results);
    }
    if (c.error) {
      console.error(c.error);
    }
  });
}
bootstrap();
