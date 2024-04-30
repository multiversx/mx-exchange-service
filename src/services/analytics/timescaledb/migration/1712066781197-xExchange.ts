import { MigrationInterface, QueryRunner } from "typeorm";

export class XExchange1712066781197 implements MigrationInterface {
    name = 'XExchange1712066781197';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW "price_candle_minute" WITH (timescaledb.continuous) AS 
      SELECT
          time_bucket('1 minute', timestamp) AS time, series, key,
          first(value, timestamp) AS open,
          min(value) AS low,
          max(value) AS high,
          last(value, timestamp) AS close
      FROM "hyper_dex_analytics"
      WHERE key in ('firstTokenPrice','secondTokenPrice', 'priceUSD')
      GROUP BY time, series, key ORDER BY time ASC;
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","price_candle_minute","SELECT\n          time_bucket('1 minute', timestamp) AS time, series, key,\n          first(value, timestamp) AS open,\n          min(value) AS low,\n          max(value) AS high,\n          last(value, timestamp) AS close\n      FROM \"hyper_dex_analytics\"\n      WHERE key in ('firstTokenPrice','secondTokenPrice', 'priceUSD')\n      GROUP BY time, series, key ORDER BY time ASC;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "price_candle_hourly" WITH (timescaledb.continuous) AS 
      SELECT
          time_bucket('1 hour', time) AS time, series, key,
          first(open, time) AS open,
          min(low) AS low,
          max(high) AS high,
          last(close, time) AS close
      FROM "price_candle_minute"
      GROUP BY time_bucket('1 hour', time), series, key ORDER BY time ASC;
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","price_candle_hourly","SELECT\n          time_bucket('1 hour', time) AS time, series, key,\n          first(open, time) AS open,\n          min(low) AS low,\n          max(high) AS high,\n          last(close, time) AS close\n      FROM \"price_candle_minute\"\n      GROUP BY time_bucket('1 hour', time), series, key ORDER BY time ASC;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "price_candle_daily" WITH (timescaledb.continuous) AS 
      SELECT
          time_bucket('1 day', time) AS time, series, key,
          first(open, time) AS open,
          min(low) AS low,
          max(high) AS high,
          last(close, time) AS close
      FROM "price_candle_hourly"
      GROUP BY time_bucket('1 day', time), series, key ORDER BY time ASC;
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","price_candle_daily","SELECT\n          time_bucket('1 day', time) AS time, series, key,\n          first(open, time) AS open,\n          min(low) AS low,\n          max(high) AS high,\n          last(close, time) AS close\n      FROM \"price_candle_hourly\"\n      GROUP BY time_bucket('1 day', time), series, key ORDER BY time ASC;"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","price_candle_daily","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "price_candle_daily"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","price_candle_hourly","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "price_candle_hourly"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","price_candle_minute","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "price_candle_minute"`);
    }

}
