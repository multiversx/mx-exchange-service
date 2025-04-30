import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { delay } from 'src/helpers/helpers';
import { AnalyticsQueryService } from '../analytics/services/analytics.query.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { Logger } from 'winston';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly routerSetter: RouterSetterService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly tokenSetter: TokenSetterService,
        private readonly apiConfig: ApiConfigService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cachePairs', verbose: true })
    async cachePairs(): Promise<void> {
        this.logger.info('Start refresh cached pairs', {
            context: 'CachePairs',
        });
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            const lpTokenID = await this.pairAbi.getLpTokenIDRaw(
                pairMetadata.address,
            );

            const lpToken =
                lpTokenID === undefined
                    ? undefined
                    : await this.tokenService.tokenMetadataRaw(lpTokenID);

            const cacheSetPromises = [
                this.pairSetterService.setFirstTokenID(
                    pairMetadata.address,
                    pairMetadata.firstTokenID,
                ),
                this.pairSetterService.setSecondTokenID(
                    pairMetadata.address,
                    pairMetadata.secondTokenID,
                ),
                this.pairSetterService.setLpTokenID(
                    pairMetadata.address,
                    lpTokenID,
                ),
            ];

            if (lpTokenID !== undefined) {
                cacheSetPromises.push(
                    this.tokenSetter.setEsdtTokenType(
                        lpTokenID,
                        EsdtTokenType.FungibleLpToken,
                    ),
                );
                cacheSetPromises.push(
                    this.tokenSetter.setMetadata(lpTokenID, lpToken),
                );
            }

            const cachedKeys = await Promise.all(cacheSetPromises);

            await this.deleteCacheKeys(cachedKeys);
        }
        this.logger.info('Finished refresh cached pairs', {
            context: 'CachePairs',
        });
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cachePairsAnalytics', verbose: true })
    async cachePairsAnalytics(): Promise<void> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }

        this.logger.info('Start refresh cached pairs analytics', {
            context: 'CachePairs',
        });

        const pairsAddresses = await this.routerAbi.pairsAddress();
        const time = '24h';
        let totalFeesUSD = new BigNumber(0);
        for (const pairAddress of pairsAddresses) {
            const firstTokenVolume24h =
                await this.analyticsQuery.getAggregatedValue({
                    series: pairAddress,
                    metric: 'firstTokenVolume',
                    time,
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const secondTokenVolume24h =
                await this.analyticsQuery.getAggregatedValue({
                    series: pairAddress,
                    metric: 'secondTokenVolume',
                    time,
                });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const volumeUSD24h = await this.analyticsQuery.getAggregatedValue({
                series: pairAddress,
                metric: 'volumeUSD',
                time,
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
            const feesUSD24h = await this.analyticsQuery.getAggregatedValue({
                series: pairAddress,
                metric: 'feesUSD',
                time,
            });
            await delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);

            totalFeesUSD = totalFeesUSD.plus(feesUSD24h);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenVolume(
                    pairAddress,
                    firstTokenVolume24h,
                ),
                this.pairSetterService.setSecondTokenVolume(
                    pairAddress,
                    secondTokenVolume24h,
                ),
                this.pairSetterService.setVolumeUSD(pairAddress, volumeUSD24h),
                this.pairSetterService.setFeesUSD(
                    pairAddress,
                    feesUSD24h,
                    time,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        const feesKey = await this.routerSetter.setTotalFeesUSD(
            time,
            totalFeesUSD.toFixed(),
        );
        await this.deleteCacheKeys([feesKey]);

        this.logger.info('Finished refresh cached pairs analytics', {
            context: 'CachePairs',
        });
    }

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cachePairsInfo', verbose: true })
    async cachePairsInfo(): Promise<void> {
        this.logger.info('Start refresh cached pairs info', {
            context: 'CachePairs',
        });
        const performance = new PerformanceProfiler('cachePairsInfo');

        const pairsAddresses = await this.routerAbi.pairsAddress();
        let totalLockedValueUSD = new BigNumber(0);
        for (const pairAddress of pairsAddresses) {
            const [
                feesAPR,
                state,
                type,
                feeState,
                totalFeePercent,
                specialFeePercent,
                feesCollectorAddress,
                feesCollectorCutPercentage,
                hasFarms,
                hasDualFarms,
                tradesCount,
                tradesCount24h,
                deployedAt,
                whitelistedAddresses,
                feeDestinations,
                initialLiquidityAdder,
                trustedSwapPairs,
            ] = await Promise.all([
                this.pairComputeService.computeFeesAPR(pairAddress),
                this.pairAbi.getStateRaw(pairAddress),
                this.pairComputeService.computeTypeFromTokens(pairAddress),
                this.pairAbi.getFeeStateRaw(pairAddress),
                this.pairAbi.getTotalFeePercentRaw(pairAddress),
                this.pairAbi.getSpecialFeePercentRaw(pairAddress),
                this.pairAbi.getFeesCollectorAddressRaw(pairAddress),
                this.pairAbi.getFeesCollectorCutPercentageRaw(pairAddress),
                this.pairComputeService.computeHasFarms(pairAddress),
                this.pairComputeService.computeHasDualFarms(pairAddress),
                this.pairComputeService.computeTradesCount(pairAddress),
                this.pairComputeService.computeTradesCount24h(pairAddress),
                this.pairComputeService.computeDeployedAt(pairAddress),
                this.pairAbi.getWhitelistedAddressesRaw(pairAddress),
                this.pairAbi.getFeeDestinationsRaw(pairAddress),
                this.pairAbi.getInitialLiquidityAdderRaw(pairAddress),
                this.pairAbi.getTrustedSwapPairsRaw(pairAddress),
            ]);

            const lockedValueUSD =
                await this.pairComputeService.computeLockedValueUSD(
                    pairAddress,
                );
            const lockedValueUSDBig = new BigNumber(lockedValueUSD);
            totalLockedValueUSD = !lockedValueUSDBig.isNaN()
                ? totalLockedValueUSD.plus(lockedValueUSD)
                : totalLockedValueUSD;

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
                this.pairSetterService.setFeesCollectorAddress(
                    pairAddress,
                    feesCollectorAddress,
                ),
                this.pairSetterService.setFeesCollectorCutPercentage(
                    pairAddress,
                    feesCollectorCutPercentage,
                ),
                this.pairSetterService.setHasFarms(pairAddress, hasFarms),
                this.pairSetterService.setHasDualFarms(
                    pairAddress,
                    hasDualFarms,
                ),
                this.pairSetterService.setTradesCount(pairAddress, tradesCount),
                this.pairSetterService.setTradesCount24h(
                    pairAddress,
                    tradesCount24h,
                ),
                this.pairSetterService.setDeployedAt(pairAddress, deployedAt),
                this.pairSetterService.setWhitelistedAddresses(
                    pairAddress,
                    whitelistedAddresses,
                ),
                this.pairSetterService.setFeeDestinations(
                    pairAddress,
                    feeDestinations,
                ),
                this.pairSetterService.setInitialLiquidityAdder(
                    pairAddress,
                    initialLiquidityAdder,
                ),
                this.pairSetterService.setTrustedSwapPairs(
                    pairAddress,
                    trustedSwapPairs,
                ),
                this.pairSetterService.setLockedValueUSD(
                    pairAddress,
                    lockedValueUSD.toFixed(),
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        const tvlKey = await this.routerSetter.setTotalLockedValueUSD(
            totalLockedValueUSD.toFixed(),
        );
        await this.deleteCacheKeys([tvlKey]);

        performance.stop();

        this.logger.info(
            `Finished refresh cached pairs info in ${
                performance.duration / 1000
            }s`,
            {
                context: 'CachePairs',
            },
        );
    }

    @Cron('*/12 * * * * *') // Update prices and reserves every 12 seconds
    @Lock({ name: 'cachePairTokenPrices', verbose: true })
    async cacheTokenPrices(): Promise<void> {
        this.logger.info('Start refresh cached pairs prices', {
            context: 'CachePairs',
        });
        const performance = new PerformanceProfiler('cacheTokenPrices');

        const pairsMetadata = await this.routerAbi.pairsMetadata();

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
                this.pairSetterService.setPairInfoMetadata(
                    pairAddress.address,
                    pairInfo,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        for (const pairMetadata of pairsMetadata) {
            const lpTokenID = await this.pairAbi.lpTokenID(
                pairMetadata.address,
            );
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
                this.tokenSetter.setDerivedUSD(lpTokenID, lpTokenPriceUSD),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        performance.stop();

        this.logger.info(
            `Finished refresh cached pairs prices in ${
                performance.duration / 1000
            }s`,
            {
                context: 'CachePairs',
            },
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        invalidatedKeys = invalidatedKeys.filter((key) => key !== undefined);

        if (invalidatedKeys.length === 0) {
            return;
        }

        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
