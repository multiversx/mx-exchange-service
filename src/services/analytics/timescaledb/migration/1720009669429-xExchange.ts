import { MigrationInterface, QueryRunner } from 'typeorm';

export class XExchange1720009669429 implements MigrationInterface {
    name = 'XExchange1720009669429';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW "token_candles_minute" WITH (timescaledb.continuous) AS 
    SELECT
          time_bucket('1 minute', timestamp) AS time,
          series,
          first(value, timestamp) FILTER (WHERE key = 'priceUSD') AS open,
          max(value) FILTER (WHERE key = 'priceUSD') AS high,
          min(value) FILTER (WHERE key = 'priceUSD') AS low,
          last(value, timestamp) FILTER (WHERE key = 'priceUSD') AS close,
          sum(value) FILTER (WHERE key = 'volumeUSD') AS volume
    FROM hyper_dex_analytics
    WHERE key in ('priceUSD', 'volumeUSD') and  series like '%-%'
    GROUP BY time, series
    ORDER BY time ASC;
`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'token_candles_minute',
                "SELECT\n          time_bucket('1 minute', timestamp) AS time,\n          series,\n          first(value, timestamp) FILTER (WHERE key = 'priceUSD') AS open,\n          max(value) FILTER (WHERE key = 'priceUSD') AS high,\n          min(value) FILTER (WHERE key = 'priceUSD') AS low,\n          last(value, timestamp) FILTER (WHERE key = 'priceUSD') AS close,\n          sum(value) FILTER (WHERE key = 'volumeUSD') AS volume\n    FROM hyper_dex_analytics\n    WHERE key in ('priceUSD', 'volumeUSD') and  series like '%-%'\n    GROUP BY time, series\n    ORDER BY time ASC;",
            ],
        );
        await queryRunner.query(`CREATE MATERIALIZED VIEW "token_candles_hourly" WITH (timescaledb.continuous) AS 
    SELECT
        time_bucket('1 hour', time) AS time, 
        series,
        open(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as open,
        high(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as high,
        low(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as low,
        close(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as close,
        volume(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as volume
    FROM "token_candles_minute"
    GROUP BY time_bucket('1 hour', time), series
    ORDER BY time ASC;
`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'token_candles_hourly',
                "SELECT\n        time_bucket('1 hour', time) AS time, \n        series,\n        open(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as open,\n        high(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as high,\n        low(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as low,\n        close(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as close,\n        volume(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as volume\n    FROM \"token_candles_minute\"\n    GROUP BY time_bucket('1 hour', time), series\n    ORDER BY time ASC;",
            ],
        );
        await queryRunner.query(`CREATE MATERIALIZED VIEW "token_candles_daily" WITH (timescaledb.continuous) AS 
    SELECT
        time_bucket('1 day', time) AS time, 
        series,
        open(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as open,
        high(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as high,
        low(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as low,
        close(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as close,
        volume(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as volume
    FROM "token_candles_hourly"
    GROUP BY time_bucket('1 day', time), series
    ORDER BY time ASC;
`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'token_candles_daily',
                "SELECT\n        time_bucket('1 day', time) AS time, \n        series,\n        open(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as open,\n        high(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as high,\n        low(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as low,\n        close(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as close,\n        volume(rollup(candlestick(time AT TIME ZONE 'UTC', open, high, low, close, volume))) as volume\n    FROM \"token_candles_hourly\"\n    GROUP BY time_bucket('1 day', time), series\n    ORDER BY time ASC;",
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'token_candles_daily', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "token_candles_daily"`);
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'token_candles_hourly', 'public'],
        );
        await queryRunner.query(
            `DROP MATERIALIZED VIEW "token_candles_hourly"`,
        );
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'token_candles_minute', 'public'],
        );
        await queryRunner.query(
            `DROP MATERIALIZED VIEW "token_candles_minute"`,
        );
    }
}
