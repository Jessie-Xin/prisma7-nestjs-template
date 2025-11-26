import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
  app.use(helmet());
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('Prisma Minimal Repro API')
    .setDescription('Minimal reproduction of Prisma ORM setup')
    .setVersion('0.1')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(configService.get('PORT') ?? 3000);
}
bootstrap();
