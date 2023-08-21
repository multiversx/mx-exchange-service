FROM node:18.17.1-alpine3.18 as build
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

ENV PYTHONUNBUFFERED=1
RUN apk update && apk add --update --no-cache alpine-sdk libusb-dev musl-dev linux-headers eudev-libs eudev-dev python2 && ln -sf python2 /usr/bin/python
RUN python -m ensurepip
RUN pip install --no-cache --upgrade pip setuptools

RUN npm ci

COPY . ./
RUN npm run build

FROM node:18.17.1-alpine3.18
WORKDIR /app
COPY --from=build /app /app

EXPOSE 3005
CMD [ "npm", "run", "start:testnet" ]
