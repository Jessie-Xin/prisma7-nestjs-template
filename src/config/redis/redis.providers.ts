import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCacheConfig, getBullConfig } from './redis.config';

@Injectable()
export class RedisProvider {
  constructor(private configService: ConfigService) {}

  getCacheConfig() {
    return getCacheConfig(this.configService);
  }

  getBullConfig() {
    return getBullConfig(this.configService);
  }
}
