import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const getRedisConfig = (configService: ConfigService) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return {
      url: configService.get('REDIS_URL'),
    };
  }

  return {
    family: 6,
    host: configService.get('REDIS_HOST', 'localhost'),
    port: configService.get('REDIS_PORT', 6379),
    password: configService.get('REDIS_PASSWORD', ''),
    username: configService.get('REDIS_USERNAME', ''),
  };
};

export const getCacheConfig = (configService: ConfigService) => {
  const redisConfig = getRedisConfig(configService);

  return {
    store: redisStore,
    ...redisConfig,
  };
};

export const getBullConfig = (configService: ConfigService) => {
  const redisConfig = getRedisConfig(configService);

  return {
    connection: redisConfig,
  };
};
