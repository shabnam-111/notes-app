FROM node:20-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

FROM dependencies AS test
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm test

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate --schema=prisma/schema.postgres.prisma && npm run build

FROM build AS database-init
CMD ["./node_modules/.bin/prisma", "db", "push", "--schema=prisma/schema.postgres.prisma", "--skip-generate"]

FROM dependencies AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN npm prune --omit=dev --ignore-scripts && mkdir -p /app/uploads
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
