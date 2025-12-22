# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

这是一个演示 Prisma ORM 7.0.1 与 NestJS 11 集成的最小化复现仓库。它作为以下功能的参考实现：
- Prisma 拆分模式架构
- 自定义 Prisma 客户端输出位置
- 带连接池的 PostgreSQL 适配器
- Redis 缓存和 BullMQ 集成

## 核心命令

### 开发工作流
```bash
# 启动基础设施（PostgreSQL + Redis）
docker-compose up -d

# 安装依赖（通过 postinstall 自动运行 prisma generate）
pnpm install

# 开发服务器（监听模式）
pnpm run dev

# 生产环境构建和启动
pnpm run build
pnpm run start:prod
```

### Prisma 操作
```bash
# 生成 Prisma 客户端（输出：src/config/database/generated/）
npx prisma generate

# 创建并应用迁移
npx prisma migrate dev --name <migration_name>

# 在生产环境应用迁移
npx prisma migrate deploy

# 打开 Prisma Studio GUI
npx prisma studio

# 检查迁移状态
npx prisma migrate status

# 重置数据库（仅限开发环境！）
npx prisma migrate reset
```

### 测试与代码检查
```bash
# 类型检查
pnpm run typecheck

# 运行测试
pnpm run test
pnpm run test:watch        # 监听模式
pnpm run test:cov          # 带覆盖率

# 代码检查和格式化
pnpm run lint              # 自动修复
pnpm run format            # Prettier
```

## 架构

### Prisma 配置

**拆分模式架构**：Prisma 模式在 `prisma/schema/` 目录下拆分为多个文件：
- `schema.prisma`：生成器配置和数据源（此处不包含模型）
- `user.prisma` 等：独立的模型文件

**自定义输出位置**：Prisma 客户端生成到 `src/config/database/generated/` 而不是 `node_modules/.prisma/client`。导入方式：
```typescript
import { PrismaClient, User } from './config/database';
// 或从应用的任何位置：
import { PrismaClient } from 'src/config/database';
```

**PostgreSQL 适配器**：使用 `@prisma/adapter-pg` 配合原生 `pg` 驱动进行连接管理。PrismaService（src/config/database/prisma.service.ts:9-13）通过 ConfigService 使用连接字符串初始化适配器。

**模式配置**：项目根目录的 `prisma.config.ts` 定义：
- 模式目录：`prisma/schema`
- 迁移目录：`prisma/migrations`
- 从环境变量获取数据源 URL

### 模块架构

**全局模块**：
- `ConfigModule`：NestJS 配置（全局作用域）
- `EventEmitterModule`：事件处理
- `DatabaseModule`：全局导出 PrismaService
- `RedisModule`：导出 RedisProvider 用于缓存/队列配置

**Redis 集成**：
- `RedisProvider`（src/config/redis/redis.providers.ts）为缓存和 BullMQ 配置提供工厂方法
- 缓存：使用 `cache-manager-redis-store`
- 队列：BullMQ 使用共享的 Redis 连接
- 环境感知：生产环境使用 REDIS_URL，开发环境使用 host/port（src/config/redis/redis.config.ts:5-20）

**应用启动**（src/main.ts）：
- Helmet 安全头
- CORS 启用（所有来源）
- 全局 ValidationPipe 用于 DTO 验证
- 全局 ClassSerializerInterceptor
- Swagger 文档位于 `/api`
  - 已配置 JWT Bearer 认证（名称：`JWT-auth`）
  - 需要认证的端点使用 `@ApiBearerAuth('JWT-auth')` 装饰器
  - 点击 Swagger UI 右上角的 "Authorize" 按钮输入 JWT token

### 数据库服务模式

PrismaService 扩展 PrismaClient 并实现 OnModuleInit（src/config/database/prisma.service.ts）。它：
1. 在构造函数中通过 super() 接受适配器
2. 在模块初始化时自动连接
3. 在导入 DatabaseModule 后全局可用

添加新模型时：
1. 创建 `prisma/schema/<model>.prisma`
2. 运行 `npx prisma migrate dev --name add_<model>`
3. 从 `src/config/database` 导入类型

## 环境变量

必需的变量（参见 `.env.example`）：
- `DATABASE_URL`：PostgreSQL 连接字符串
- `REDIS_HOST`、`REDIS_PORT`：Redis 连接（开发环境）
- `REDIS_URL`：Redis 连接字符串（生产环境）
- `PORT`：服务器端口（默认：3000）
- `JWT_SECRET`、`JWT_REFRESH_SECRET`：JWT 密钥
- `SMTP_*`：邮件服务配置
  - 使用 Gmail 时必须使用 **App Password**（不能使用普通密码）
  - 生成方式：Google Account → Security → 2-Step Verification → App passwords
  - 参考：https://support.google.com/mail/?p=BadCredentials

## 关键约束

- **禁止**在 `prisma/schema/schema.prisma` 中添加模型 - 创建独立文件
- **禁止**手动编辑 `src/config/database/generated/` 中的文件 - 由 Prisma 重新生成
- **禁止**在生产环境使用 `prisma migrate reset` - 仅限开发环境
- TypeScript 严格模式部分禁用（strictNullChecks、noImplicitAny: false）
