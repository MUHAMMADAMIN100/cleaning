import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression = require('compression');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // За прокси Railway — чтобы Secure-cookie и protocol определялись верно
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by'); // не раскрываем стек

  // Заголовки безопасности. API потребляется кросс-доменно (Vercel ↔ Railway),
  // поэтому CORP=cross-origin (иначе браузер заблокирует ответы), а CSP не нужна
  // (отдаём только JSON) — оставляем HSTS/nosniff/frameguard и пр.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(compression()); // сжатие ответов

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // CORS — разрешаем фронт CRM и лендинг, с куками
  const origins = [
    process.env.FRONTEND_URL,
    process.env.LANDING_URL,
    'http://localhost:5173',
    'http://localhost:5174',
  ].filter((o): o is string => Boolean(o));

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Archidea CRM API запущен на порту ${port}`);
}
bootstrap();
