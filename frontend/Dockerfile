FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM dependencies AS test
RUN npm test

FROM dependencies AS builder
ENV NEXT_PUBLIC_API_URL=/api/v1 CONTAINER_BUILD=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 CONTAINER_BUILD=1
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
EXPOSE 3000
CMD ["npm", "start"]
