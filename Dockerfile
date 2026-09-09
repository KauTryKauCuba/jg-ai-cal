FROM node:22-slim AS web-build
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM node:22-slim AS server-build
WORKDIR /app/server
COPY apps/server/package*.json ./
RUN npm ci
COPY apps/server/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY apps/server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY --from=web-build /app/web/dist ./public

EXPOSE 5050
CMD ["node", "dist/index.js"]
