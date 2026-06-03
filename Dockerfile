# Stage 1: Install dependencies and compile TypeScript
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# Stage 2: Production image with only compiled output
FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Compiled JavaScript
COPY --from=build /app/dist/ dist/

# Migration files needed by the migrate script at deploy time
COPY --from=build /app/src/migrations/ dist/migrations/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
