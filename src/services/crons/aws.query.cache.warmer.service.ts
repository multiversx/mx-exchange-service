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

    // @Cron(CronExpression.EVERY_5_MINUTES)
    @Cron(CronExpression.EVERY_MINUTE)
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
            await delay(1000);
            const priceUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: tokenID,
                    metric: 'priceUSD',
                });
            await delay(1000);
            const lockedValueUSD24h = await this.analyticsQuery.getValues24h({
                series: tokenID,
                metric: 'lockedValueUSD',
            });
            await delay(1000);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: tokenID,
                    metric: 'lockedValueUSD',
                });
            await delay(1000);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                series: tokenID,
                metric: 'volumeUSD',
            });
            await delay(1000);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: tokenID,
                    metric: 'volumeUSD',
                });
            await delay(1000);

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

        const allTokensVolumeUSDCompleteValuesSum = await this.analyticsQuery.getSumCompleteValues({
            series: '%-%',
            metric: 'volumeUSD',
        });
        await delay(1000);
        const allTokensVolumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
            series: '%-%',
            metric: 'volumeUSD',
        });

        const allTokensVolumesKeys = await Promise.all([
            this.analyticsAWSSetter.setSumCompleteValues(
              'factory',
              'volumeUSD',
              allTokensVolumeUSDCompleteValuesSum,
            ),
            this.analyticsAWSSetter.setValues24hSum(
              'factory',
              'volumeUSD',
              allTokensVolumeUSD24hSum,
            ),
        ]) 
        await this.deleteCacheKeys(allTokensVolumesKeys);

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
            delay(1000);
            const lockedValueUSDCompleteValues =
                await this.analyticsQuery.getLatestCompleteValues({
                    series: pairAddress,
                    metric: 'lockedValueUSD',
                });
            delay(1000);
            const feesUSD = await this.analyticsQuery.getValues24hSum({
                series: pairAddress,
                metric: 'feesUSD',
            });
            delay(1000);
            const volumeUSD24hSum = await this.analyticsQuery.getValues24hSum({
                series: pairAddress,
                metric: 'volumeUSD',
            });
            delay(1000);
            const volumeUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: pairAddress,
                    metric: 'volumeUSD',
                });
            delay(1000);
            const feesUSDCompleteValuesSum =
                await this.analyticsQuery.getSumCompleteValues({
                    series: pairAddress,
                    metric: 'feesUSD',
                });
            delay(1000);

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
        profiler.stop();
        this.logger.info(
            `Finish refresh pairs analytics in ${profiler.duration}`,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
