import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './config/database/database.module';
import { RedisModule } from './config/redis/redis.module';
import { RedisProvider } from './config/redis/redis.providers';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    CacheModule.registerAsync({
      imports: [RedisModule],
      inject: [RedisProvider],
      useFactory: async (redisProvider: RedisProvider) =>
        redisProvider.getCacheConfig(),
    }),
    BullModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisProvider],
      useFactory: async (redisProvider: RedisProvider) =>
        redisProvider.getBullConfig(),
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
