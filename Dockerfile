

FROM node:22-alpine as build
WORKDIR /usr/src/app

# Fake DB URL ONLY for Prisma Client generation
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/dummy"

# Install all deps (including dev) to allow prisma generate and build
COPY ./package*.json ./
RUN npm install

# Copy prisma files and config for generate
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Copy the rest of the source and build
COPY . .
RUN npx prisma generate
RUN npm run build


FROM node:22-alpine as production
ENV TZ=Africa/Lagos
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Only install production dependencies
COPY ./package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy prisma schema (optional at runtime) and the generated Prisma client from build stage
COPY ./prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY --from=build /usr/src/app/node_modules/.prisma /usr/src/app/node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma /usr/src/app/node_modules/@prisma
COPY --from=build /usr/src/app/node_modules/@prisma/client /usr/src/app/node_modules/@prisma/client

# Copy the compiled application
COPY --from=build /usr/src/app/dist ./dist

# Start the app
CMD ["node", "dist/src/main.js"]

