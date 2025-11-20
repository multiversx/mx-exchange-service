import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { PUB_SUB } from '../redis.pubSub.module';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { TokenPersistenceService } from 'src/modules/persistence/services/token.persistence.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';

@Injectable()
export class TokensCacheWarmerService {
    constructor(
        private readonly tokenSetterService: TokenSetterService,
        private readonly pairSetter: PairSetterService,
        private readonly tokenPersistence: TokenPersistenceService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheTokensMetadata', verbose: true })
    async cacheTokensMetadata(): Promise<void> {
        this.logger.info('Start refresh cached tokens metadata', {
            context: 'CacheTokens',
        });

        const profiler = new PerformanceProfiler();

        const tokens = await this.tokenPersistence.getTokens(
            {},
            undefined,
            true,
        );

        for (const token of tokens) {
            const cachedKeys = await Promise.all([
                this.tokenSetterService.setBaseMetadata(
                    token.identifier,
                    token,
                ),
                this.tokenSetterService.setEsdtTokenType(
                    token.identifier,
                    token.type,
                ),
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

        const profiler = new PerformanceProfiler();

        const tokens = await this.tokenPersistence.getTokens(
            { type: EsdtTokenType.FungibleToken },
            {
                identifier: 1,
                derivedEGLD: 1,
                price: 1,
            },
        );

        for (const token of tokens) {
            const {
                identifier: tokenID,
                price: priceDerivedUSD,
                derivedEGLD: priceDerivedEGLD,
            } = token;

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

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        invalidatedKeys = invalidatedKeys.filter((key) => key !== undefined);

        if (invalidatedKeys.length === 0) {
            return;
        }

        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
