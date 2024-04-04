import { MigrationInterface, QueryRunner } from "typeorm";

export class XExchange1712151092148 implements MigrationInterface {
    name = 'XExchange1712151092148';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","sum_hourly","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_hourly"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","sum_daily","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_daily"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_minute" WITH (timescaledb.continuous) AS 
      SELECT
          time_bucket('1 minute', timestamp) AS time, series, key,
          last(value, timestamp) AS last,
          sum(value) AS sum
      FROM "hyper_dex_analytics"
      WHERE key = 'feesUSD' OR key = 'volumeUSD'
      GROUP BY time, series, key;
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","sum_minute","SELECT\n          time_bucket('1 minute', timestamp) AS time, series, key,\n          last(value, timestamp) AS last,\n          sum(value) AS sum\n      FROM \"hyper_dex_analytics\"\n      WHERE key = 'feesUSD' OR key = 'volumeUSD'\n      GROUP BY time, series, key;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_hourly" WITH (timescaledb.continuous) AS 
        SELECT
            time_bucket('1 hour', time) AS time, series, key,
            last(last, time) AS last,
            sum(sum) AS sum
        FROM "sum_minute"
        GROUP BY time_bucket('1 hour', time), series, key;
      `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","sum_hourly","SELECT\n            time_bucket('1 hour', time) AS time, series, key,\n            last(last, time) AS last,\n            sum(sum) AS sum\n        FROM \"sum_minute\"\n        GROUP BY time_bucket('1 hour', time), series, key;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_daily"  WITH (timescaledb.continuous) AS 
        SELECT
            time_bucket('1 day', time) AS time, series, key,
            last(last, time) AS last,
            sum(sum) AS sum
        FROM "sum_hourly"
        GROUP BY time_bucket('1 day', time), series, key;
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","sum_daily","SELECT\n            time_bucket('1 day', time) AS time, series, key,\n            last(last, time) AS last,\n            sum(sum) AS sum\n        FROM \"sum_hourly\"\n        GROUP BY time_bucket('1 day', time), series, key;"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","sum_daily","public"]);
      await queryRunner.query(`DROP MATERIALIZED VIEW "sum_daily"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","sum_hourly","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_hourly"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","sum_minute","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_minute"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_daily" WITH (timescaledb.continuous)  AS SELECT
      time_bucket('1 day', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key = 'feesUSD' OR key = 'volumeUSD'
    GROUP BY time, series, key;`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","sum_daily","SELECT\n      time_bucket('1 day', timestamp) AS time, series, key,\n      last(value, timestamp) AS last,sum(value) AS sum\n    FROM \"hyper_dex_analytics\"\n    WHERE key = 'feesUSD' OR key = 'volumeUSD'\n    GROUP BY time, series, key;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_hourly" WITH (timescaledb.continuous)  AS SELECT
      time_bucket('1 hour', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key = 'feesUSD' OR key = 'volumeUSD'
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","sum_hourly","SELECT\n      time_bucket('1 hour', timestamp) AS time, series, key,\n      last(value, timestamp) AS last,sum(value) AS sum\n    FROM \"hyper_dex_analytics\"\n    WHERE key = 'feesUSD' OR key = 'volumeUSD'\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;"]);
    }

}
