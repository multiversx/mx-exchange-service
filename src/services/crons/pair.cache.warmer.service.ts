import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig } from '../../config';
import { ContextService } from '../context/context.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { oneHour } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';

@Injectable()
export class PairCacheWarmerService {
    private invalidatedKeys = [];
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly abiPairService: PairAbiService,
        private readonly apiService: ElrondApiService,
        private readonly context: ContextService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.context.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );

            const [
                firstToken,
                secondToken,
                lpToken,
                totalFeePercent,
                specialFeePercent,
                state,
            ] = await Promise.all([
                this.apiService
                    .getService()
                    .getESDTToken(pairMetadata.firstTokenID),
                this.apiService
                    .getService()
                    .getESDTToken(pairMetadata.secondTokenID),
                this.apiService.getService().getESDTToken(lpTokenID),
                this.abiPairService.getTotalFeePercent(pairMetadata.address),
                this.abiPairService.getSpecialFeePercent(pairMetadata.address),
                this.abiPairService.getState(pairMetadata.address),
            ]);

            const cacheKeys = await Promise.all([
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
                this.pairSetterService.setTotalFeePercent(
                    pairMetadata.address,
                    totalFeePercent,
                ),
                this.pairSetterService.setSpecialFeePercent(
                    pairMetadata.address,
                    specialFeePercent,
                ),
                this.pairSetterService.setState(pairMetadata.address, state),
            ]);
            this.invalidatedKeys.push(cacheKeys);

            await this.setContextCache(
                pairMetadata.firstTokenID,
                firstToken,
                oneHour(),
            );
            await this.setContextCache(
                pairMetadata.secondTokenID,
                secondToken,
                oneHour(),
            );
            await this.setContextCache(lpTokenID, lpToken, oneHour());

            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddresses = await this.context.getAllPairsAddress();

        for (const pairAddress of pairsAddresses) {
            const pairInfo = await this.abiPairService.getPairInfoMetadata(
                pairAddress,
            );
            this.invalidatedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenReserve(
                    pairAddress,
                    pairInfo.reserves0,
                ),
                this.pairSetterService.setSecondTokenReserve(
                    pairAddress,
                    pairInfo.reserves1,
                ),
                this.pairSetterService.setTotalSupply(
                    pairAddress,
                    pairInfo.totalSupply,
                ),
            ]);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheTokenPrices(): Promise<void> {
        const pairsMetadata = await this.context.getPairsMetadata();
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
                this.pairComputeService.computeTokenPriceUSD(
                    pairMetadata.firstTokenID,
                ),
                this.pairComputeService.computeSecondTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeTokenPriceUSD(
                    pairMetadata.secondTokenID,
                ),
                this.pairComputeService.computeLpTokenPriceUSD(
                    pairMetadata.address,
                ),
            ]);

            this.invalidatedKeys = await Promise.all([
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
                    firstTokenPriceUSD.toFixed(),
                ),
                this.pairSetterService.setSecondTokenPriceUSD(
                    pairMetadata.address,
                    secondTokenPriceUSD.toFixed(),
                ),
                this.pairSetterService.setLpTokenPriceUSD(
                    pairMetadata.address,
                    lpTokenPriceUSD,
                ),
            ]);
            await this.deleteCacheKeys();
        }
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
