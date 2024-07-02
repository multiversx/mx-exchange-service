import { MigrationInterface, QueryRunner } from 'typeorm';

export class XExchange1718807173692 implements MigrationInterface {
    name = 'XExchange1718807173692';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'close_hourly', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "close_hourly"`);
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'close_daily', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "close_daily"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "close_daily" WITH (timescaledb.continuous) AS
    SELECT 
      time_bucket('1 day', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')
    GROUP BY time, series, key;
  `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'close_daily',
                "SELECT \n      time_bucket('1 day', timestamp) as time,\n      series,\n      key,\n      last(value, timestamp) as last\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')\n    GROUP BY time, series, key;",
            ],
        );
        await queryRunner.query(`CREATE MATERIALIZED VIEW "close_hourly" WITH (timescaledb.continuous) AS
    SELECT 
      time_bucket('1 hour', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;
  `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'close_hourly',
                "SELECT \n      time_bucket('1 hour', timestamp) as time,\n      series,\n      key,\n      last(value, timestamp) as last\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;",
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'close_hourly', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "close_hourly"`);
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'close_daily', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "close_daily"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "close_daily" WITH (timescaledb.continuous) AS SELECT 
      time_bucket('1 day', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD')
    GROUP BY time, series, key;`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'close_daily',
                "SELECT \n      time_bucket('1 day', timestamp) as time,\n      series,\n      key,\n      last(value, timestamp) as last\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD')\n    GROUP BY time, series, key;",
            ],
        );
        await queryRunner.query(`CREATE MATERIALIZED VIEW "close_hourly" WITH (timescaledb.continuous) AS SELECT 
      time_bucket('1 hour', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD')
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;`);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'close_hourly',
                "SELECT \n      time_bucket('1 hour', timestamp) as time,\n      series,\n      key,\n      last(value, timestamp) as last\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD')\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;",
            ],
        );
    }
}
