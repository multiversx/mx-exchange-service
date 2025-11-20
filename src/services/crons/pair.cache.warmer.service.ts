import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import BigNumber from 'bignumber.js';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { Logger } from 'winston';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';
import { PairPersistenceService } from 'src/modules/persistence/services/pair.persistence.service';
import { AnalyticsSetterService } from 'src/modules/analytics/services/analytics.setter.service';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly routerSetter: RouterSetterService,
        private readonly tokenService: TokenService,
        private readonly tokenSetter: TokenSetterService,
        private readonly pairPersistence: PairPersistenceService,
        private readonly analyticsSetter: AnalyticsSetterService,
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
        this.logger.info('Start refresh cached pairs analytics', {
            context: 'CachePairs',
        });

        const pairs = await this.pairPersistence.getPairs(
            {},
            {
                address: 1,
                firstTokenVolume24h: 1,
                secondTokenVolume24h: 1,
                volumeUSD24h: 1,
                feesUSD24h: 1,
            },
            undefined,
            true,
        );

        const time = '24h';
        let totalFeesUSD = new BigNumber(0);
        for (const pair of pairs) {
            const {
                address: pairAddress,
                firstTokenVolume24h,
                secondTokenVolume24h,
                volumeUSD24h,
                feesUSD24h,
            } = pair;
            totalFeesUSD = totalFeesUSD.plus(pair.feesUSD24h);

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

        const pairs = await this.pairPersistence.getPairs(
            {},
            {
                address: 1,
                feesAPR: 1,
                feeState: 1,
                state: 1,
                totalFeePercent: 1,
                specialFeePercent: 1,
                feesCollectorAddress: 1,
                feesCollectorCutPercentage: 1,
                tradesCount: 1,
                tradesCount24h: 1,
                deployedAt: 1,
                whitelistedManagedAddresses: 1,
                feeDestinations: 1,
                initialLiquidityAdder: 1,
                trustedSwapPairs: 1,
                lockedValueUSD: 1,
            },
            undefined,
            true,
        );

        let totalLockedValueUSD = new BigNumber(0);
        for (const pair of pairs) {
            const {
                address: pairAddress,
                lockedValueUSD,
                feesAPR,
                state,
                feeState,
                totalFeePercent,
                specialFeePercent,
                feesCollectorAddress,
                feesCollectorCutPercentage,
                tradesCount,
                tradesCount24h,
                deployedAt,
                whitelistedManagedAddresses: whitelistedAddresses,
                feeDestinations,
                initialLiquidityAdder,
                trustedSwapPairs,
            } = pair;

            const [type, hasFarms, hasDualFarms] = await Promise.all([
                this.pairComputeService.computeTypeFromTokens(pair.address),
                this.pairComputeService.computeHasFarms(pair.address),
                this.pairComputeService.computeHasDualFarms(pair.address),
            ]);

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
                    totalFeePercent,
                ),
                this.pairSetterService.setSpecialFeePercent(
                    pairAddress,
                    specialFeePercent,
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
                    lockedValueUSD,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        const tvlKeys = await Promise.all([
            this.routerSetter.setTotalLockedValueUSD(
                totalLockedValueUSD.toFixed(),
            ),
            this.analyticsSetter.totalValueLockedUSD(
                totalLockedValueUSD.toFixed(),
            ),
        ]);
        await this.deleteCacheKeys(tvlKeys);

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

        const pairs = await this.pairPersistence.getPairs(
            {},
            {
                address: 1,
                info: 1,
                firstTokenPrice: 1,
                secondTokenPrice: 1,
                firstTokenPriceUSD: 1,
                secondTokenPriceUSD: 1,
                liquidityPoolTokenId: 1,
                liquidityPoolTokenPriceUSD: 1,
            },
            undefined,
            true,
        );

        for (const pair of pairs) {
            const {
                address,
                info: pairInfo,
                firstTokenPrice,
                secondTokenPrice,
                firstTokenPriceUSD,
                secondTokenPriceUSD,
                liquidityPoolTokenId: lpTokenID,
                liquidityPoolTokenPriceUSD: lpTokenPriceUSD,
            } = pair;
            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenReserve(
                    address,
                    pairInfo.reserves0,
                ),
                this.pairSetterService.setSecondTokenReserve(
                    address,
                    pairInfo.reserves1,
                ),
                this.pairSetterService.setTotalSupply(
                    address,
                    pairInfo.totalSupply,
                ),
                this.pairSetterService.setPairInfoMetadata(address, pairInfo),
                this.pairSetterService.setFirstTokenPrice(
                    address,
                    firstTokenPrice,
                ),
                this.pairSetterService.setSecondTokenPrice(
                    address,
                    secondTokenPrice,
                ),
                this.pairSetterService.setFirstTokenPriceUSD(
                    address,
                    firstTokenPriceUSD,
                ),
                this.pairSetterService.setSecondTokenPriceUSD(
                    address,
                    secondTokenPriceUSD,
                ),
                this.pairSetterService.setLpTokenPriceUSD(
                    address,
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
