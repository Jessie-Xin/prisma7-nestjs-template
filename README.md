# Prisma 最小化复现

这是一个从 Montem 后端提取的 Prisma ORM 设置的最小化复现。本仓库仅包含 Prisma 与 NestJS 集成的核心基础设施代码，包括 Redis 和 BullMQ 集成。

## 技术栈

- **框架**: NestJS 11 with TypeScript
- **数据库**: PostgreSQL 16 with Prisma ORM 7.0.1
- **缓存/队列**: Redis with BullMQ
- **Prisma 适配器**: @prisma/adapter-pg (node-postgres 驱动)

## 主要特性

- 拆分模式架构（多个 `.prisma` 文件）
- 自定义 Prisma 客户端输出位置
- 带连接池的 PostgreSQL 适配器
- Redis 缓存和 BullMQ 作业队列
- 简单的用户 CRUD 示例以演示 Prisma 使用

## 项目结构

```
prisma-minimal-repro/
├── prisma/
│   └── schema/
│       ├── schema.prisma    # 生成器和数据源配置
│       └── user.prisma      # 用户模型
├── src/
│   ├── config/
│   │   ├── database/        # Prisma 服务和模块
│   │   └── redis/           # Redis 配置
│   ├── user/                # 示例用户模块
│   ├── app.module.ts
│   └── main.ts
├── docker-compose.yml       # PostgreSQL + Redis
├── prisma.config.ts         # Prisma 配置
└── package.json
```

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
yarn install
```

这将通过 postinstall 钩子自动运行 `prisma generate`。

### 3. 运行迁移

```bash
npx prisma migrate dev --name init
```

### 4. 启动服务器

```bash
pnpm run dev
```

API 将在 http://localhost:3000 上可用

- Swagger 文档: http://localhost:3000/api
- 健康检查: http://localhost:3000/health

## 常用命令

```bash
# 生成 Prisma 客户端
npx prisma generate

# 创建新的迁移
npx prisma migrate dev --name <migration_name>

# 应用迁移（生产环境）
npx prisma migrate deploy

# 打开 Prisma Studio（GUI）
npx prisma studio

# 运行测试
pnpm run test

# 类型检查
pnpm run typecheck
```

## 环境变量

复制 `.env.example` 到 `.env` 并根据需要调整：

| 变量 | 描述 | 默认值 |
|----------|-------------|---------|
| `PORT` | 服务器端口 | 3000 |
| `DATABASE_URL` | PostgreSQL 连接字符串 | postgresql://postgres:password@localhost:5432/prisma_repro |
| `REDIS_HOST` | Redis 主机 | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |

## Prisma 配置说明

### 拆分模式架构

Prisma 模式在 `prisma/schema/` 目录下拆分为多个文件：
- `schema.prisma`: 生成器和数据源配置
- `user.prisma`: 用户模型定义

### 自定义输出位置

Prisma 客户端生成到 `src/config/database/generated/` 以便于导入：

```typescript
import { PrismaClient } from './config/database';
```

### PostgreSQL 适配器

使用 `@prisma/adapter-pg` 配合原生 `pg` 驱动进行连接管理：

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
```
