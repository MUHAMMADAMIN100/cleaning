import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
