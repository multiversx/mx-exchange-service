import { MigrationInterface, QueryRunner } from 'typeorm';

export class xExchange1677412507858 implements MigrationInterface {
    name = 'xExchange1677412507858';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "hyper_dex_analytics" ("timestamp" TIMESTAMP NOT NULL, "series" character varying NOT NULL, "key" character varying NOT NULL, "value" numeric(128,64) NOT NULL DEFAULT '0', CONSTRAINT "UQ_23ef8bf5efbf75b9d2e8bc40ed1" UNIQUE ("timestamp", "series", "key"), CONSTRAINT "PK_23ef8bf5efbf75b9d2e8bc40ed1" PRIMARY KEY ("timestamp", "series", "key"))`,
        );
        await queryRunner.query(
            `SELECT create_hypertable('hyper_dex_analytics', 'timestamp', chunk_time_interval => INTERVAL '30 days')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "hyper_dex_analytics"`);
    }
}
