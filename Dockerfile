FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package.json, pnpm-lock.yaml and prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install app dependencies
RUN pnpm install --frozen-lockfile

COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

RUN pnpm run build

FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000

CMD ["node", "dist/main"]