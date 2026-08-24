FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# ---

FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init and ffmpeg for audio transcoding in Voice AI
RUN apk add --no-cache dumb-init ffmpeg

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
