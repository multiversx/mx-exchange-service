import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { awsConfig } from 'src/config';
import { delay } from 'src/helpers/helpers';
import { AnalyticsSetterService } from 'src/modules/analytics/services/analytics.setter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { AWSTimestreamQueryService } from '../aws/aws.timestream.query';
import { ElrondDataApiQueryService } from '../data-api/elrond.data-api.query';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class AnalyticsQueryCacheWarmerService {
    constructor(
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly elrondDataApiQuery: ElrondDataApiQueryService,
        private readonly tokenService: TokenService,
        private readonly routerGetter: RouterGetterService,
        private readonly analyticsSetter: AnalyticsSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async updateHistoricTokensData(): Promise<void> {
        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        for (const tokenID of tokens) {
            const priceUSD24h = (await this.elrondDataApiQuery.isReadActive())
                ? await this.elrondDataApiQuery.getValues24h({
                    series: tokenID,
                    key: 'priceUSD',
                })
                : await this.awsTimestreamQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'priceUSD',
                });
            delay(1000);
            const priceUSDCompleteValues =
                (await this.elrondDataApiQuery.isReadActive())
                    ? await this.elrondDataApiQuery.getLatestCompleteValues({
                        series: tokenID,
                        key: 'priceUSD',
                    })
                    : await this.awsTimestreamQuery.getLatestCompleteValues({
                        table: awsConfig.timestream.tableName,
                        series: tokenID,
                        metric: 'priceUSD',
                    });
            delay(1000);
            const lockedValueUSD24h = (await this.elrondDataApiQuery.isReadActive())
                ? await this.elrondDataApiQuery.getValues24h({
                    series: tokenID,
                    key: 'lockedValueUSD',
                })
                : await this.awsTimestreamQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'lockedValueUSD',
                });
            delay(1000);
            const lockedValueUSDCompleteValues =
                (await this.elrondDataApiQuery.isReadActive())
                    ? await this.elrondDataApiQuery.getLatestCompleteValues({
                        series: tokenID,
                        key: 'lockedValueUSD',
                    })
                    : await this.awsTimestreamQuery.getLatestCompleteValues({
                        table: awsConfig.timestream.tableName,
                        series: tokenID,
                        metric: 'lockedValueUSD',
                    });
            delay(1000);
            const volumeUSD24hSum = (await this.elrondDataApiQuery.isReadActive())
                ? await this.elrondDataApiQuery.getValues24hSum({
                    series: tokenID,
                    key: 'volumeUSD',
                })
                : await this.awsTimestreamQuery.getValues24hSum({
                    table: awsConfig.timestream.tableName,
                    series: tokenID,
                    metric: 'volumeUSD',
                });
            delay(1000);
            const volumeUSDCompleteValuesSum =
                (await this.elrondDataApiQuery.isReadActive())
                    ? await this.elrondDataApiQuery.getSumCompleteValues({
                        series: tokenID,
                        key: 'volumeUSD',
                    })
                    : await this.awsTimestreamQuery.getSumCompleteValues({
                        table: awsConfig.timestream.tableName,
                        series: tokenID,
                        metric: 'volumeUSD',
                    });

            const cachedKeys = await Promise.all([
                this.analyticsSetter.setValues24h(
                    tokenID,
                    'priceUSD',
                    priceUSD24h,
                ),
                this.analyticsSetter.setLatestCompleteValues(
                    tokenID,
                    'priceUSD',
                    priceUSDCompleteValues,
                ),
                this.analyticsSetter.setValues24h(
                    tokenID,
                    'lockedValueUSD',
                    lockedValueUSD24h,
                ),
                this.analyticsSetter.setLatestCompleteValues(
                    tokenID,
                    'lockedValueUSD',
                    lockedValueUSDCompleteValues,
                ),
                this.analyticsSetter.setValues24hSum(
                    tokenID,
                    'volumeUSD',
                    volumeUSD24hSum,
                ),
                this.analyticsSetter.setSumCompleteValues(
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
            const lockedValueUSD24h = await this.awsTimestreamQuery.getValues24h({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'lockedValueUSD',
            });
            delay(1000);
            const lockedValueUSDCompleteValues =
                await this.awsTimestreamQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                });
            delay(1000);
            const feesUSD = await this.awsTimestreamQuery.getValues24hSum({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'feesUSD',
            });
            delay(1000);
            const volumeUSD24hSum = await this.awsTimestreamQuery.getValues24hSum({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'volumeUSD',
            });
            delay(1000);
            const volumeUSDCompleteValuesSum =
                await this.awsTimestreamQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                });

            const cachedKeys = await Promise.all([
                this.analyticsSetter.setValues24h(
                    pairAddress,
                    'lockedValueUSD',
                    lockedValueUSD24h,
                ),
                this.analyticsSetter.setLatestCompleteValues(
                    pairAddress,
                    'lockedValueUSD',
                    lockedValueUSDCompleteValues,
                ),
                this.analyticsSetter.setValues24hSum(
                    pairAddress,
                    'feesUSD',
                    feesUSD,
                ),
                this.analyticsSetter.setValues24hSum(
                    pairAddress,
                    'volumeUSD',
                    volumeUSD24hSum,
                ),
                this.analyticsSetter.setSumCompleteValues(
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
