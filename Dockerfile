FROM node:24-alpine as build
WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app /app

EXPOSE 3005
CMD [ "npm", "run", "start:testnet" ]
