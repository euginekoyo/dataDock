FROM node:20.14.0-bullseye-slim as build_image
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:20.14.0-bullseye-slim
WORKDIR /app

# Use env file instead of hardcoding
COPY --from=build_image /app/package.json ./package.json
COPY --from=build_image /app/node_modules ./node_modules
COPY --from=build_image /app/.next ./.next
COPY --from=build_image /app/public ./public
COPY --from=build_image /app/lib/seeder.js ./lib/seeder.js

EXPOSE 5050
CMD ["yarn", "start"]
