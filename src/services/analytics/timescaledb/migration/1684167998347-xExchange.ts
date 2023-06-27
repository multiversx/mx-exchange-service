import { MigrationInterface, QueryRunner } from 'typeorm';

export class xExchange1684167998347 implements MigrationInterface {
    name = 'xExchange1684167998347';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW "pd_close_minute" WITH (timescaledb.continuous) AS 
    SELECT 
      time_bucket('1 minute', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('launchedTokenAmount',
        'acceptedTokenAmount',
        'launchedTokenPrice',
        'acceptedTokenPrice',
        'launchedTokenPriceUSD',
        'acceptedTokenPriceUSD')
    GROUP BY time, series, key;
  `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'pd_close_minute',
                "SELECT \n      time_bucket('1 minute', timestamp) as time,\n      series,\n      key,\n      last(value, timestamp) as last\n    FROM \"hyper_dex_analytics\"\n    WHERE key IN ('launchedTokenAmount',\n        'acceptedTokenAmount',\n        'launchedTokenPrice',\n        'acceptedTokenPrice',\n        'launchedTokenPriceUSD',\n        'acceptedTokenPriceUSD')\n    AND timestamp >= NOW() - INTERVAL '1 day'\n    GROUP BY time, series, key;",
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'pd_close_minute', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "pd_close_minute"`);
    }
}
