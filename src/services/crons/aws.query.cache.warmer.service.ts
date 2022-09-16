import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { awsConfig } from 'src/config';
import { AnalyticsAWSSetterService } from 'src/modules/analytics/services/analytics.aws.setter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { AWSTimestreamQueryService } from '../aws/aws.timestream.query';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class AWSQueryCacheWarmerService {
    constructor(
        private readonly awsQuery: AWSTimestreamQueryService,
        private readonly tokenService: TokenService,
        private readonly routerGetter: RouterGetterService,
        private readonly analyticsAWSSetter: AnalyticsAWSSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async updateHistoricTokensData(): Promise<void> {
        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        for (const tokenID of tokens) {
            const [
                priceUSD24h,
                priceUSDCompleteValues,
                lockedValueUSD24h,
                lockedValueUSDCompleteValues,
                volumeUSD24hSum,
                volumeUSDCompleteValuesSum,
            ] = await Promise.all([
                this.awsQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'priceUSD',
                }),
                this.awsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'priceUSD',
                }),
                this.awsQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'lockedValueUSD',
                }),
                this.awsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'lockedValueUSD',
                }),
                this.awsQuery.getValues24hSum({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'volumeUSD',
                }),
                this.awsQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'volumeUSD',
                }),
            ]);

            const cachedKeys = await Promise.all([
                this.analyticsAWSSetter.setValues24h(
                    tokenID,
                    'priceUSD',
                    priceUSD24h,
                ),
                this.analyticsAWSSetter.setLatestCompleteValues(
                    tokenID,
                    'priceUSD',
                    priceUSDCompleteValues,
                ),
                this.analyticsAWSSetter.setValues24h(
                    tokenID,
                    'lockedValueUSD',
                    lockedValueUSD24h,
                ),
                this.analyticsAWSSetter.setLatestCompleteValues(
                    tokenID,
                    'lockedValueUSD',
                    lockedValueUSDCompleteValues,
                ),
                this.analyticsAWSSetter.setValues24hSum(
                    tokenID,
                    'volumeUSD',
                    volumeUSD24hSum,
                ),
                this.analyticsAWSSetter.setSumCompleteValues(
                    tokenID,
                    'volumeUSD',
                    volumeUSDCompleteValuesSum,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async updateHistoricPairsData(): Promise<void> {
        const pairsAddresses = await this.routerGetter.getAllPairsAddress();
        for (const pairAddress of pairsAddresses) {
            const [
                lockedValueUSD24h,
                lockedValueUSDCompleteValues,
                feesUSD,
                volumeUSD24hSum,
                volumeUSDCompleteValuesSum,
            ] = await Promise.all([
                this.awsQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                }),
                this.awsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                }),
                this.awsQuery.getValues24hSum({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'feesUSD',
                }),
                this.awsQuery.getValues24hSum({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                }),
                this.awsQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                }),
            ]);

            const cachedKeys = await Promise.all([
                this.analyticsAWSSetter.setValues24h(
                    pairAddress,
                    'lockedValueUSD',
                    lockedValueUSD24h,
                ),
                this.analyticsAWSSetter.setLatestCompleteValues(
                    pairAddress,
                    'lockedValueUSD',
                    lockedValueUSDCompleteValues,
                ),
                this.analyticsAWSSetter.setValues24hSum(
                    pairAddress,
                    'feesUSD',
                    feesUSD,
                ),
                this.analyticsAWSSetter.setValues24hSum(
                    pairAddress,
                    'volumeUSD',
                    volumeUSD24hSum,
                ),
                this.analyticsAWSSetter.setSumCompleteValues(
                    pairAddress,
                    'volumeUSD',
                    volumeUSDCompleteValuesSum,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
