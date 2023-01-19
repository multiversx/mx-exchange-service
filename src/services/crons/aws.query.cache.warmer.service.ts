import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { awsConfig } from 'src/config';
import { delay } from 'src/helpers/helpers';
import { AnalyticsAWSSetterService } from 'src/modules/analytics/services/analytics.aws.setter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { AnalyticsQueryService } from '../analytics/services/analytics.query.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class AWSQueryCacheWarmerService {
    constructor(
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly routerGetter: RouterGetterService,
        private readonly analyticsAWSSetter: AnalyticsAWSSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.updateHistoricTokensData().catch(() => { })
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async updateHistoricTokensData(): Promise<void> {
        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        for (const tokenID of tokens) {
            // const priceUSD24h = await this.analyticsQuery.getValues24h({
            //     table: awsConfig.timestream.tableName,
            //     series: tokenID,
            //     metric: 'priceUSD',
            // });
            delay(1000);
            const priceUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'priceUSD',
                });
            return;
            delay(1000);
            const lockedValueUSD24h = await this.analyticsQuery.getValues24h({
                table: awsConfig.timestream.tableName,
                series: tokenID,
                metric: 'lockedValueUSD',
            });
            delay(1000);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'lockedValueUSD',
                });
            delay(1000);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                table: awsConfig.timestream.tableName,
                series: tokenID,
                metric: 'volumeUSD',
            });
            delay(1000);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'volumeUSD',
                });

            const cachedKeys = await Promise.all([
                // this.analyticsAWSSetter.setValues24h(
                //     tokenID,
                //     'priceUSD',
                //     priceUSD24h,
                // ),
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
            const lockedValueUSD24h = await this.analyticsQuery.getValues24h({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'lockedValueUSD',
            });
            delay(1000);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                });
            delay(1000);
            const feesUSD = await this.analyticsQuery.getValues24hSum({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'feesUSD',
            });
            delay(1000);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'volumeUSD',
            });
            delay(1000);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                });
            delay(1000);
            const feesUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'feesUSD',
                });

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
                this.analyticsAWSSetter.setSumCompleteValues(
                    pairAddress,
                    'feesUSD',
                    feesUSDCompleteValuesSum,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
