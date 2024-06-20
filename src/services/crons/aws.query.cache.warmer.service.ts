import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { delay } from 'src/helpers/helpers';
import { AnalyticsAWSSetterService } from 'src/modules/analytics/services/analytics.aws.setter.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { Logger } from 'winston';
import { AnalyticsQueryService } from '../analytics/services/analytics.query.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { constantsConfig } from 'src/config';

@Injectable()
export class AWSQueryCacheWarmerService {
    constructor(
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
        private readonly analyticsAWSSetter: AnalyticsAWSSetterService,
        private readonly apiConfig: ApiConfigService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'updateHistoricTokensData', verbose: true })
    async updateHistoricTokensData(): Promise<void> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }

        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        this.logger.info('Start refresh tokens analytics');
        const profiler = new PerformanceProfiler();
        for (const tokenID of tokens) {
            const priceUSD24h = await this.analyticsQuery.getValues24h({
                series: tokenID,
                metric: 'priceUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const priceUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: tokenID,
                    metric: 'priceUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const lockedValueUSD24h = await this.analyticsQuery.getValues24h({
                series: tokenID,
                metric: 'lockedValueUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: tokenID,
                    metric: 'lockedValueUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                series: tokenID,
                metric: 'volumeUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: tokenID,
                    metric: 'volumeUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);

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
        profiler.stop();
        this.logger.info(
            `Finish refresh tokens analytics in ${profiler.duration}`,
        );
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'updateHistoricPairsData', verbose: true })
    async updateHistoricPairsData(): Promise<void> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }

        const pairsAddresses = await this.routerAbi.pairsAddress();
        this.logger.info('Start refresh pairs analytics');
        const profiler = new PerformanceProfiler();
        for (const pairAddress of pairsAddresses) {
            const lockedValueUSD24h = await this.analyticsQuery.getValues24h({
                series: pairAddress,
                metric: 'lockedValueUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const firstTokenPrice24h = await this.analyticsQuery.getValues24h({
                series: pairAddress,
                metric: 'firstTokenPrice',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const secondTokenPrice24h = await this.analyticsQuery.getValues24h({
                series: pairAddress,
                metric: 'secondTokenPrice',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const feesUSD = await this.analyticsQuery.getValues24hSum({
                series: pairAddress,
                metric: 'feesUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                series: pairAddress,
                metric: 'volumeUSD',
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: pairAddress,
                    metric: 'volumeUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const feesUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: pairAddress,
                    metric: 'feesUSD',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const firstTokenPriceCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: pairAddress,
                    metric: 'firstTokenPrice',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const secondTokenPriceCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: pairAddress,
                    metric: 'secondTokenPrice',
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);

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
                this.analyticsAWSSetter.setValues24h(
                    pairAddress,
                    'firstTokenPrice',
                    firstTokenPrice24h,
                ),
                this.analyticsAWSSetter.setValues24h(
                    pairAddress,
                    'secondTokenPrice',
                    secondTokenPrice24h,
                ),
                this.analyticsAWSSetter.setLatestCompleteValues(
                    pairAddress,
                    'firstTokenPrice',
                    firstTokenPriceCompleteValues,
                ),
                this.analyticsAWSSetter.setLatestCompleteValues(
                    pairAddress,
                    'secondTokenPrice',
                    secondTokenPriceCompleteValues,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        const allPairsVolumeUSDCompleteValuesSum =
            await this.analyticsQuery.getSumCompleteValues({
                series: 'erd1%',
                metric: 'volumeUSD',
            });
        await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
        const allPairsVolumeUSD24hSum =
            await this.analyticsQuery.getValues24hSum({
                series: 'erd1%',
                metric: 'volumeUSD',
            });
        await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
        const totalLockedValueUSD =
            await this.analyticsQuery.getLatestCompleteValues({
                series: 'factory',
                metric: 'totalLockedValueUSD',
            });
        await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
        const totalLockedValueUSD24h = await this.analyticsQuery.getValues24h({
            series: 'factory',
            metric: 'totalLockedValueUSD',
        });
        const factoryKeys = await Promise.all([
            this.analyticsAWSSetter.setSumCompleteValues(
                'factory',
                'volumeUSD',
                allPairsVolumeUSDCompleteValuesSum,
            ),
            this.analyticsAWSSetter.setValues24hSum(
                'factory',
                'volumeUSD',
                allPairsVolumeUSD24hSum,
            ),
            this.analyticsAWSSetter.setLatestCompleteValues(
                'factory',
                'totalLockedValueUSD',
                totalLockedValueUSD,
            ),
            this.analyticsAWSSetter.setValues24h(
                'factory',
                'totalLockedValueUSD',
                totalLockedValueUSD24h,
            ),
        ]);

        await this.deleteCacheKeys(factoryKeys);

        profiler.stop();
        this.logger.info(
            `Finish refresh pairs analytics in ${profiler.duration}`,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
