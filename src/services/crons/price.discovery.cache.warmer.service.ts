import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { cacheConfig, scAddress } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from 'src/modules/price-discovery/services/price.discovery.compute.service';
import { PriceDiscoverySetterService } from 'src/modules/price-discovery/services/price.discovery.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class PriceDiscoveryCacheWarmerService {
    constructor(
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoverySetter: PriceDiscoverySetterService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly cachingService: CachingService,
        private readonly apiService: ElrondApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cachePriceDiscovery(): Promise<void> {
        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;

        for (const address of priceDiscoveryAddresses) {
            const [
                launchedTokenID,
                acceptedTokenID,
                redeemTokenID,
                startBlock,
                endBlock,
            ] = await Promise.all([
                this.priceDiscoveryAbi.getLaunchedTokenID(address),
                this.priceDiscoveryAbi.getAcceptedTokenID(address),
                this.priceDiscoveryAbi.getRedeemTokenID(address),
                this.priceDiscoveryAbi.getStartBlock(address),
                this.priceDiscoveryAbi.getEndBlock(address),
            ]);

            const [
                minLaunchedTokenPrice,
                noLimitPhaseDurationBlocks,
                linearPenaltyPhaseDurationBlocks,
                fixedPenaltyPhaseDurationBlocks,
                lockingScAddress,
                unlockEpoch,
                penaltyMinPercentage,
                penaltyMaxPercentage,
                fixedPenaltyPercentage,
            ] = await Promise.all([
                this.priceDiscoveryAbi.getMinLaunchedTokenPrice(address),
                this.priceDiscoveryAbi.getNoLimitPhaseDurationBlocks(address),
                this.priceDiscoveryAbi.getLinearPenaltyPhaseDurationBlocks(
                    address,
                ),
                this.priceDiscoveryAbi.getFixedPenaltyPhaseDurationBlocks(
                    address,
                ),
                this.priceDiscoveryAbi.getLockingScAddress(address),
                this.priceDiscoveryAbi.getUnlockEpoch(address),
                this.priceDiscoveryAbi.getPenaltyMinPercentage(address),
                this.priceDiscoveryAbi.getPenaltyMaxPercentage(address),
                this.priceDiscoveryAbi.getFixedPenaltyPercentage(address),
            ]);
            const [
                launchedToken,
                acceptedToken,
                redeemToken,
            ] = await Promise.all([
                this.apiService.getService().getToken(launchedTokenID),
                this.apiService.getService().getToken(acceptedTokenID),
                this.apiService.getNftCollection(redeemTokenID),
            ]);

            const invalidatedKeys = await Promise.all([
                this.priceDiscoverySetter.setLaunchedTokenID(
                    address,
                    launchedTokenID,
                ),
                this.priceDiscoverySetter.setAcceptedTokenID(
                    address,
                    acceptedTokenID,
                ),
                this.priceDiscoverySetter.setRedeemTokenID(
                    address,
                    redeemTokenID,
                ),
                this.priceDiscoverySetter.setStartBlock(address, startBlock),
                this.priceDiscoverySetter.setEndBlock(address, endBlock),
                this.priceDiscoverySetter.setMinLaunchedTokenPrice(
                    address,
                    minLaunchedTokenPrice,
                ),
                this.priceDiscoverySetter.setNoLimitPhaseDurationBlocks(
                    address,
                    noLimitPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setLinearPenaltyPhaseDurationBlocks(
                    address,
                    linearPenaltyPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setFixedPenaltyPhaseDurationBlocks(
                    address,
                    fixedPenaltyPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setLockingScAddress(
                    address,
                    lockingScAddress,
                ),
                this.priceDiscoverySetter.setUnlockEpoch(address, unlockEpoch),
                this.priceDiscoverySetter.setPenaltyMinPercentage(
                    address,
                    penaltyMinPercentage,
                ),
                this.priceDiscoverySetter.setPenaltyMaxPercentage(
                    address,
                    penaltyMaxPercentage,
                ),
                this.priceDiscoverySetter.setFixedPenaltyPercentage(
                    address,
                    fixedPenaltyPercentage,
                ),
            ]);

            const contextCacheKeys = await Promise.all([
                this.setContextCache(launchedTokenID, launchedToken, oneHour()),
                this.setContextCache(acceptedTokenID, acceptedToken, oneHour()),
                this.setContextCache(redeemTokenID, redeemToken, oneHour()),
            ]);

            invalidatedKeys.push(...contextCacheKeys);

            await this.deleteCacheKeys(invalidatedKeys);
        }
    }

    @Cron('*/6 * * * * *') // Update prices and reserves every 6 seconds
    async cacheTokensPrices(): Promise<void> {
        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;

        for (const address of priceDiscoveryAddresses) {
            const [
                launchedTokenAmount,
                acceptedTokenAmount,
                currentPhase,
            ] = await Promise.all([
                this.priceDiscoveryAbi.getLaunchedTokenBalance(address),
                this.priceDiscoveryAbi.getAcceptedTokenBalance(address),
                this.priceDiscoveryAbi.getCurrentPhase(address),
            ]);

            const invalidatedKeys: string[] = await Promise.all([
                this.priceDiscoverySetter.setLaunchedTokenAmount(
                    address,
                    launchedTokenAmount,
                ),
                this.priceDiscoverySetter.setAcceptedTokenAmount(
                    address,
                    acceptedTokenAmount,
                ),
                this.priceDiscoverySetter.setCurrentPhase(
                    address,
                    currentPhase,
                ),
            ]);

            const [
                launchedTokenPrice,
                acceptedTokenPrice,
                launchedTokenPriceUSD,
            ] = await Promise.all([
                this.priceDiscoveryCompute.computeLaunchedTokenPrice(address),
                this.priceDiscoveryCompute.computeAcceptedTokenPrice(address),
                this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                    address,
                ),
            ]);

            invalidatedKeys.push(
                ...(await Promise.all([
                    this.priceDiscoverySetter.setLaunchedTokenPrice(
                        address,
                        launchedTokenPrice,
                    ),
                    this.priceDiscoverySetter.setAcceptedTokenPrice(
                        address,
                        acceptedTokenPrice,
                    ),
                    this.priceDiscoverySetter.setLaunchedTokenPriceUSD(
                        address,
                        launchedTokenPriceUSD,
                    ),
                ])),
            );

            await this.deleteCacheKeys(invalidatedKeys);
        }
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        return cacheKey;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
