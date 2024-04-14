FROM node:hydrogen-alpine as base

# Dependencies
FROM base as deps
WORKDIR /app

COPY package.json .npmrc ./

RUN npm i

# Builder
FROM base as builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Runner
FROM base as runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

ENV PORT 8080

EXPOSE 8080

# Run the web service on container startup.
CMD ["npm", "run", "start:production"]
