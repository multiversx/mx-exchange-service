import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { delay } from 'src/helpers/helpers';
import { AnalyticsQueryService } from '../analytics/services/analytics.query.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Locker } from 'src/utils/locker';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly apiService: MXApiService,
        private readonly tokenSetter: TokenSetterService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly apiConfig: ApiConfigService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async cachePairs(): Promise<void> {
        Locker.lock('CachePairs', async () => {
            this.logger.info('Start refresh cached pairs');
            const pairsMetadata = await this.routerAbi.pairsMetadata();
            for (const pairMetadata of pairsMetadata) {
                const lpTokenID = await this.pairAbi.getLpTokenIDRaw(
                    pairMetadata.address,
                );

                const [firstToken, secondToken] = await Promise.all([
                    this.apiService.getToken(pairMetadata.firstTokenID),
                    this.apiService.getToken(pairMetadata.secondTokenID),
                ]);

                const cachedKeys = await Promise.all([
                    this.pairSetterService.setFirstTokenID(
                        pairMetadata.address,
                        pairMetadata.firstTokenID,
                    ),
                    this.pairSetterService.setSecondTokenID(
                        pairMetadata.address,
                        pairMetadata.secondTokenID,
                    ),
                ]);
                if (lpTokenID !== undefined) {
                    const lpToken = await this.apiService.getToken(lpTokenID);
                    cachedKeys.push(
                        await this.pairSetterService.setLpTokenID(
                            pairMetadata.address,
                            lpTokenID,
                        ),
                    );
                    cachedKeys.push(
                        await this.tokenSetter.setTokenMetadata(
                            lpTokenID,
                            lpToken,
                        ),
                    );
                }
                cachedKeys.push(
                    await this.tokenSetter.setTokenMetadata(
                        pairMetadata.firstTokenID,
                        firstToken,
                    ),
                );
                cachedKeys.push(
                    await this.tokenSetter.setTokenMetadata(
                        pairMetadata.secondTokenID,
                        secondToken,
                    ),
                );

                await this.deleteCacheKeys(cachedKeys);
            }
            this.logger.info('Finished refresh cached pairs');
        });
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cachePairsAnalytics(): Promise<void> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }
        Locker.lock('pairsAnalytics', async () => {
            const pairsAddresses = await this.routerAbi.pairsAddress();
            const time = '24h';
            for (const pairAddress of pairsAddresses) {
                const firstTokenVolume24h =
                    await this.analyticsQuery.getAggregatedValue({
                        series: pairAddress,
                        metric: 'firstTokenVolume',
                        time,
                    });
                await delay(1000);
                const secondTokenVolume24h =
                    await this.analyticsQuery.getAggregatedValue({
                        series: pairAddress,
                        metric: 'secondTokenVolume',
                        time,
                    });
                await delay(1000);
                const volumeUSD24h =
                    await this.analyticsQuery.getAggregatedValue({
                        series: pairAddress,
                        metric: 'volumeUSD',
                        time,
                    });
                await delay(1000);
                const feesUSD24h = await this.analyticsQuery.getAggregatedValue(
                    {
                        series: pairAddress,
                        metric: 'feesUSD',
                        time,
                    },
                );
                await delay(1000);

                const cachedKeys = await Promise.all([
                    this.pairSetterService.setFirstTokenVolume(
                        pairAddress,
                        firstTokenVolume24h,
                        time,
                    ),
                    this.pairSetterService.setSecondTokenVolume(
                        pairAddress,
                        secondTokenVolume24h,
                        time,
                    ),
                    this.pairSetterService.setVolumeUSD(
                        pairAddress,
                        volumeUSD24h,
                        time,
                    ),
                    this.pairSetterService.setFeesUSD(
                        pairAddress,
                        feesUSD24h,
                        time,
                    ),
                ]);
                await this.deleteCacheKeys(cachedKeys);
            }
        });
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cachePairsInfo(): Promise<void> {
        const pairsAddresses = await this.routerAbi.pairsAddress();

        for (const pairAddress of pairsAddresses) {
            const [
                feesAPR,
                state,
                type,
                feeState,
                totalFeePercent,
                specialFeePercent,
            ] = await Promise.all([
                this.pairComputeService.computeFeesAPR(pairAddress),
                this.pairAbi.getStateRaw(pairAddress),
                this.pairComputeService.computeTypeFromTokens(pairAddress),
                this.pairAbi.getFeeStateRaw(pairAddress),
                this.pairAbi.getTotalFeePercentRaw(pairAddress),
                this.pairAbi.getSpecialFeePercentRaw(pairAddress),
            ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFeesAPR(pairAddress, feesAPR),
                this.pairSetterService.setState(pairAddress, state),
                this.pairSetterService.setType(pairAddress, type),
                this.pairSetterService.setFeeState(pairAddress, feeState),
                this.pairSetterService.setTotalFeePercent(
                    pairAddress,
                    new BigNumber(totalFeePercent)
                        .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                        .toNumber(),
                ),
                this.pairSetterService.setSpecialFeePercent(
                    pairAddress,
                    new BigNumber(specialFeePercent)
                        .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                        .toNumber(),
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron('*/12 * * * * *') // Update prices and reserves every 12 seconds
    async cacheTokenPrices(): Promise<void> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const invalidatedKeys = [];
        for (const pairAddress of pairsMetadata) {
            const pairInfo = await this.pairAbi.getPairInfoMetadataRaw(
                pairAddress.address,
            );

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves0,
                ),
                this.pairSetterService.setSecondTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves1,
                ),
                this.pairSetterService.setTotalSupply(
                    pairAddress.address,
                    pairInfo.totalSupply,
                ),
            ]);
            invalidatedKeys.push(cachedKeys);
        }

        for (const pairMetadata of pairsMetadata) {
            const [
                firstTokenPrice,
                firstTokenPriceUSD,
                secondTokenPrice,
                secondTokenPriceUSD,
                lpTokenPriceUSD,
            ] = await Promise.all([
                this.pairComputeService.computeFirstTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeFirstTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeLpTokenPriceUSD(
                    pairMetadata.address,
                ),
            ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenPrice(
                    pairMetadata.address,
                    firstTokenPrice,
                ),
                this.pairSetterService.setSecondTokenPrice(
                    pairMetadata.address,
                    secondTokenPrice,
                ),
                this.pairSetterService.setFirstTokenPriceUSD(
                    pairMetadata.address,
                    firstTokenPriceUSD,
                ),
                this.pairSetterService.setSecondTokenPriceUSD(
                    pairMetadata.address,
                    secondTokenPriceUSD,
                ),
                this.pairSetterService.setLpTokenPriceUSD(
                    pairMetadata.address,
                    lpTokenPriceUSD,
                ),
            ]);
            invalidatedKeys.push(cachedKeys);
        }
        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
