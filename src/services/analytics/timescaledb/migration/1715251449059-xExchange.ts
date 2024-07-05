import { MigrationInterface, QueryRunner } from 'typeorm';

export class XExchange1715251449059 implements MigrationInterface {
    name = 'XExchange1715251449059';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'sum_hourly', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_hourly"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_hourly" WITH (timescaledb.continuous) AS 
    SELECT
      time_bucket('1 hour', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key IN ('feesUSD', 'volumeUSD')
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;
  `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'sum_hourly',
                "SELECT\n      time_bucket('1 hour', timestamp) AS time, series, key,\n      last(value, timestamp) AS last,sum(value) AS sum\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('feesUSD', 'volumeUSD')\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;",
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'sum_hourly', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "sum_hourly"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "sum_hourly" WITH (timescaledb.continuous) AS SELECT
      time_bucket('1 hour', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key = 'feesUSD' OR key = 'volumeUSD'
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'sum_hourly',
                "SELECT\n      time_bucket('1 hour', timestamp) AS time, series, key,\n      last(value, timestamp) AS last,sum(value) AS sum\n    FROM \"hyper_dex_analytics\"\n    WHERE key = 'feesUSD' OR key = 'volumeUSD'\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;",
            ],
        );
    }
}
