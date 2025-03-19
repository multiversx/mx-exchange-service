import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { PUB_SUB } from '../redis.pubSub.module';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import moment from 'moment';
import { TokenRepositoryService } from 'src/modules/tokens/services/token.repository.service';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';

@Injectable()
export class TokensCacheWarmerService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenComputeService: TokenComputeService,
        private readonly tokenSetterService: TokenSetterService,
        private readonly tokenRepository: TokenRepositoryService,
        private readonly pairSetter: PairSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheTokensMetadata', verbose: true })
    async cacheTokensMetadata(): Promise<void> {
        this.logger.info('Start refresh cached tokens metadata', {
            context: 'CacheTokens',
        });

        const tokenIDs = await this.tokenService.getUniqueTokenIDs(false);
        const profiler = new PerformanceProfiler();

        for (const tokenID of tokenIDs) {
            const token = await this.tokenService.tokenMetadataRaw(tokenID);
            const tokenType = await this.tokenRepository.getTokenType(tokenID);

            const cachedKeys = await Promise.all([
                this.tokenSetterService.setMetadata(tokenID, token),
                this.tokenSetterService.setBaseMetadata(tokenID, token),
                this.tokenSetterService.setEsdtTokenType(tokenID, tokenType),
            ]);

            await this.deleteCacheKeys(cachedKeys);
        }

        profiler.stop();
        this.logger.info(
            `Finish refresh tokens metadata in ${profiler.duration}`,
            {
                context: 'CacheTokens',
            },
        );
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'cacheTokensPrices', verbose: true })
    async cacheTokensPrices(): Promise<void> {
        this.logger.info('Start refresh tokens prices', {
            context: 'CacheTokens',
        });

        const tokensIDs = await this.tokenService.getUniqueTokenIDs(false);
        const profiler = new PerformanceProfiler();

        for (const tokenID of tokensIDs) {
            const priceDerivedEGLD =
                await this.tokenComputeService.computeTokenPriceDerivedEGLD(
                    tokenID,
                    [],
                );
            const priceDerivedUSD =
                await this.tokenComputeService.computeTokenPriceDerivedUSD(
                    tokenID,
                );

            const cachedKeys = await Promise.all([
                this.tokenSetterService.setDerivedEGLD(
                    tokenID,
                    priceDerivedEGLD,
                ),
                this.tokenSetterService.setDerivedUSD(tokenID, priceDerivedUSD),
                this.pairSetter.setTokenPriceUSD(tokenID, priceDerivedUSD),
            ]);

            await this.deleteCacheKeys(cachedKeys);
        }

        profiler.stop();
        this.logger.info(
            `Finish refresh tokens prices in ${profiler.duration}`,
            {
                context: 'CacheTokens',
            },
        );
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheTokens', verbose: true })
    async cacheTokens(): Promise<void> {
        this.logger.info('Start refresh cached tokens data', {
            context: 'CacheTokens',
        });

        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        const profiler = new PerformanceProfiler();

        await this.cacheTokensSwapsCount();

        for (const tokenID of tokens) {
            const volumeLast2D =
                await this.tokenComputeService.computeTokenLast2DaysVolumeUSD(
                    tokenID,
                );
            const pricePrevious24h =
                await this.tokenComputeService.computeTokenPrevious24hPrice(
                    tokenID,
                );
            const pricePrevious7D =
                await this.tokenComputeService.computeTokenPrevious7dPrice(
                    tokenID,
                );
            const liquidityUSD =
                await this.tokenComputeService.computeTokenLiquidityUSD(
                    tokenID,
                );
            const createdAt =
                await this.tokenComputeService.computeTokenCreatedAtTimestamp(
                    tokenID,
                );

            const cachedKeys = await Promise.all([
                this.tokenSetterService.setVolumeLast2Days(
                    tokenID,
                    volumeLast2D,
                ),
                this.tokenSetterService.setPricePrevious24h(
                    tokenID,
                    pricePrevious24h,
                ),
                this.tokenSetterService.setPricePrevious7d(
                    tokenID,
                    pricePrevious7D,
                ),
                this.tokenSetterService.setLiquidityUSD(tokenID, liquidityUSD),
                this.tokenSetterService.setCreatedAt(tokenID, createdAt),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        await this.cacheTokensTrendingScore(tokens);

        profiler.stop();
        this.logger.info(`Finish refresh tokens data in ${profiler.duration}`, {
            context: 'CacheTokens',
        });
    }

    private async cacheTokensSwapsCount(): Promise<void> {
        const nowTimestamp = moment.utc().unix();
        const oneDayAgoTimestamp = moment
            .unix(nowTimestamp)
            .subtract(1, 'day')
            .unix();
        const twoDaysyAgoTimestamp = moment
            .unix(nowTimestamp)
            .subtract(2, 'days')
            .unix();

        const [swapsCount, previous24hSwapsCount] = await Promise.all([
            this.tokenComputeService.computeAllTokensSwapsCount(
                oneDayAgoTimestamp,
                nowTimestamp,
            ),
            this.tokenComputeService.computeAllTokensSwapsCount(
                twoDaysyAgoTimestamp,
                oneDayAgoTimestamp,
            ),
        ]);

        const cachedKeys = await Promise.all([
            this.tokenSetterService.setAllTokensSwapsCount(swapsCount),
            this.tokenSetterService.setAllTokensPrevious24hSwapsCount(
                previous24hSwapsCount,
            ),
        ]);
        await this.deleteCacheKeys(cachedKeys);
    }

    private async cacheTokensTrendingScore(tokens: string[]): Promise<void> {
        const cachedKeys = [];
        for (const tokenID of tokens) {
            const trendingScore =
                await this.tokenComputeService.computeTokenTrendingScore(
                    tokenID,
                );

            const cachedKey = await this.tokenSetterService.setTrendingScore(
                tokenID,
                trendingScore,
            );

            cachedKeys.push(cachedKey);
        }
        await this.deleteCacheKeys(cachedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        invalidatedKeys = invalidatedKeys.filter((key) => key !== undefined);

        if (invalidatedKeys.length === 0) {
            return;
        }

        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
