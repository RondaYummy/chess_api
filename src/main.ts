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

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: process.env.COOKIES_SECRET, // Змініть на безпечний ключ
    cookie: {
      secure: process.env.SECURE_COOKIES === 'true',  // У продакшені має бути true
      httpOnly: true,
      maxAge: 48000 * 60 * 60, // 48 години
    },
  });

  app.use(
    cors({
      origin: ['http://localhost:5173', process.env.BASE_WEB_APP_URL],
      credentials: true,
    }),
  );

  // Налаштування CORS для Socket.IO
  app.useWebSocketAdapter(new SocketAdapter(app));

  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true, transform: true }));

  // app.getHttpAdapter().getInstance().addHook('onRequest', (request, reply, done) => {
  //   reply.removeHeader('x-powered-by');
  //   done();
  // });
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
