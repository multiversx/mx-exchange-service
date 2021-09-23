import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig } from '../../config';
import { ContextService } from '../context/context.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiPairService } from 'src/modules/pair/abi-pair.service';
import { PairService } from 'src/modules/pair/pair.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { oneHour, oneMinute } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class PairCacheWarmerService {
    private invalidatedKeys = [];
    constructor(
        private readonly pairService: PairService,
        private readonly abiPairService: AbiPairService,
        private readonly apiService: ElrondApiService,
        private readonly context: ContextService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.context.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            await this.setPairCache(
                pairMetadata.address,
                'firstTokenID',
                pairMetadata.firstTokenID,
                oneHour(),
            );
            await this.setPairCache(
                pairMetadata.address,
                'secondTokenID',
                pairMetadata.secondTokenID,
                oneHour(),
            );

            const firstToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.firstTokenID);
            await this.setContextCache(
                pairMetadata.firstTokenID,
                firstToken,
                oneHour(),
            );

            const secondToken = await this.apiService
                .getService()
                .getESDTToken(pairMetadata.secondTokenID);
            await this.setContextCache(
                pairMetadata.secondTokenID,
                secondToken,
                oneHour(),
            );

            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );
            await this.setPairCache(
                pairMetadata.address,
                'lpTokenID',
                lpTokenID,
                oneHour(),
            );

            const lpToken = await this.apiService
                .getService()
                .getESDTToken(lpTokenID);
            await this.setContextCache(lpTokenID, lpToken, oneHour());

            const state = await this.abiPairService.getState(
                pairMetadata.address,
            );
            await this.setPairCache(
                pairMetadata.address,
                'state',
                state,
                oneHour(),
            );
        }
        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const pairInfoMetadata = await this.abiPairService.getPairInfoMetadata(
                pairAddress,
            );
            await this.setPairCache(
                pairAddress,
                'valueLocked',
                pairInfoMetadata,
                oneMinute(),
            );

            const totalFeePercent = await this.abiPairService.getTotalFeePercent(
                pairAddress,
            );
            await this.setPairCache(
                pairAddress,
                'totalFeePercent',
                totalFeePercent,
                oneMinute(),
            );
        });
        await Promise.all(promises);
        await this.deleteCacheKeys();
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
                this.pairService.computeFirstTokenPrice(pairMetadata.address),
                this.pairService.computeTokenPriceUSD(
                    pairMetadata.firstTokenID,
                ),
                this.pairService.computeSecondTokenPrice(pairMetadata.address),
                this.pairService.computeTokenPriceUSD(
                    pairMetadata.secondTokenID,
                ),
                this.pairService.computeLpTokenPriceUSD(pairMetadata.address),
            ]);

            await Promise.all([
                this.setPairCache(
                    pairMetadata.address,
                    'firstTokenPrice',
                    firstTokenPrice,
                    oneMinute(),
                ),
                this.setPairCache(
                    pairMetadata.address,
                    'firstTokenPriceUSD',
                    firstTokenPriceUSD,
                    oneMinute(),
                ),
                this.setPairCache(
                    pairMetadata.address,
                    'secondTokenPrice',
                    secondTokenPrice,
                    oneMinute(),
                ),
                this.setPairCache(
                    pairMetadata.address,
                    'secondTokenPriceUSD',
                    secondTokenPriceUSD,
                    oneMinute(),
                ),
                this.setPairCache(
                    pairMetadata.address,
                    'lpTokenPriceUSD',
                    lpTokenPriceUSD,
                    oneMinute(),
                ),
            ]);
        }
        await this.deleteCacheKeys();
    }

    private async setPairCache(
        pairAddress: string,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('pair', pairAddress, key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
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
