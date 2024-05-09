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

@Injectable()
export class TokensCacheWarmerService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenComputeService: TokenComputeService,
        private readonly tokenSetterService: TokenSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheTokens', verbose: true })
    async cacheTokens(): Promise<void> {
        this.logger.info('Start refresh cached tokens data', {
            context: 'CacheTokens',
        });

        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        const profiler = new PerformanceProfiler();

        for (const tokenID of tokens) {
            const [
                volumeLast2D,
                pricePrevious24h,
                pricePrevious7D,
                liquidityUSD,
            ] = await Promise.all([
                this.tokenComputeService.computeTokenLast2DaysVolumeUSD(
                    tokenID,
                ),
                this.tokenComputeService.computeTokenPrevious24hPrice(tokenID),
                this.tokenComputeService.computeTokenPrevious7dPrice(tokenID),
                this.tokenComputeService.computeTokenLiquidityUSD(tokenID),
            ]);

            const cachedKeys = await Promise.all([
                this.tokenSetterService.setVolumeLast2D(tokenID, volumeLast2D),
                this.tokenSetterService.setPricePrevious24h(
                    tokenID,
                    pricePrevious24h,
                ),
                this.tokenSetterService.setPricePrevious7d(
                    tokenID,
                    pricePrevious7D,
                ),
                this.tokenSetterService.setLiquidityUSD(tokenID, liquidityUSD),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }

        profiler.stop();
        this.logger.info(`Finish refresh tokens data in ${profiler.duration}`);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
