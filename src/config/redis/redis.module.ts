import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisProvider } from './redis.providers';

@Module({
  imports: [ConfigModule],
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule {}
