import * as path from 'node:path';
import dotenv from 'dotenv';
import { env, PrismaConfig } from 'prisma/config';

dotenv.config();

export default {
  datasource: {
    url: env('DATABASE_URL'),
  },
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
} satisfies PrismaConfig;
