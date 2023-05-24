import { MigrationInterface, QueryRunner } from 'typeorm';

export class xExchange1678783387115 implements MigrationInterface {
    name = 'xExchange1678783387115';
    transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW "token_burned_weekly" WITH (timescaledb.continuous) AS 
        SELECT
            time_bucket('1 week', timestamp) AS time, series, key,
            sum(value) AS sum
        FROM "hyper_dex_analytics"
        WHERE key = 'feeBurned' OR key = 'penaltyBurned'
        GROUP BY time, series, key ORDER BY time ASC;
    `);
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'token_burned_weekly',
                "SELECT\n            time_bucket('1 week', timestamp) AS time, series, key\n            sum(value) AS sum\n        FROM \"hyper_dex_analytics\"\n        WHERE key = 'feeBurned' OR key = 'penaltyBurned'\n        GROUP BY time, series, key ORDER BY time ASC;",
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'token_burned_weekly', 'public'],
        );
        await queryRunner.query(`DROP MATERIALIZED VIEW "token_burned_weekly"`);
    }
}
