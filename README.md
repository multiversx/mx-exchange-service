GraphQl service to provide backend environment for xExchange

## Dependencies

1. Node.js > @18.x.x is required to be installed [docs](https://nodejs.org/en/)
2. Redis Server is required to be installed [docs](https://redis.io/).
3. RabbitMQ Server is required to be installed [docs](https://www.rabbitmq.com/download.html).
4. MongoDB Server is required to be installed [docs](https://www.mongodb.com/docs/manual/installation).

You can use `docker-compose up` in a separate terminal to use a local docker container for all these dependencies.

After running the sample, you can stop the Docker container with `docker-compose down`

## Available Scripts

This is an MultiversX project built on Nest.js framework.

### `npm run start`

Runs the app in the production mode.
Make requests to [http://localhost:3005/graphql](http://localhost:3005/graphql).

## Running the app

1. At the root folder run (make sure you have node v16.x.x)

```bash
$ npm install
```

2. Proper config .env.example based on desired configuration

3. Start the app

```bash
# development debug mode
$ npm run start:debug
# development mode
$ npm run start:dev
# production mode
$ npm run start
```

4. Disable SSL for TimescaleDB in `timescaledb.module.ts`:

```
// ssl: true,
// extra: {
//     ssl: {
//         rejectUnauthorized: false,
//     },
// },
```

It depends on the following external systems:

-   gateway:
    -   docs: [https://docs.multiversx.com/sdk-and-tools/proxy/](https://docs.multiversx.com/sdk-and-tools/proxy/)
-   index:
    -   to gather information for some statistics
    -   docs: [https://docs.multiversx.com/sdk-and-tools/elastic-search/](https://docs.multiversx.com/sdk-and-tools/elastic-search/)
-   api:
    -   to get information regarding tokens, metaesdts and user balances
    -   docs: [https://docs.multiversx.com/sdk-and-tools/rest-api/multiversx-api/](https://docs.multiversx.com/sdk-and-tools/rest-api/multiversx-api/)
        It uses on the following internal systems:
-   redis: used to cache various data, for performance purposes
-   rabbitmq:
    -   fetching events from blockchain emitted events via notifier

A service instance can be started with the following behavior:

-   public API: provides graphQL queries for the consumers
-   private API: used to report prometheus metrics & health checks
-   rabbitMQ: used to fetch events in real time and create analytics data
-   cache warmer: used to proactively fetch data & pushes it to cache, to improve performance & scalability

It depends on the following optional external systems:

-   events notifier rabbitmq: queue that pushes logs & events which are handled internally e.g. to store token prices
-   AWS Timestream: used to store time based metrics such as prices, volumes, fees

It uses the following optional internal systems:

-   mongo database: used to store configs and addresses
