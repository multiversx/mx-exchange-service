import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';
import { Lock, OriginLogger } from '@multiversx/sdk-nestjs-common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

@Injectable()
export class RouterCacheWarmerService {
    private readonly logger = new OriginLogger(RouterCacheWarmerService.name);

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly routerSetter: RouterSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheRouterPairs', verbose: true })
    async cacheRouterPairs(): Promise<void> {
        this.logger.log('Start refresh router pairs');
        const profiler = new PerformanceProfiler();

        const pairsMetadata = await this.routerAbi.getPairsMetadataRaw();
        const pairsAddresses = pairsMetadata.map((pair) => pair.address);

        const cacheKeys = await Promise.all([
            this.routerSetter.setPairsMetadata(pairsMetadata),
            this.routerSetter.setAllPairsAddress(pairsAddresses),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        profiler.stop();
        this.logger.log(
            `Finished refresh router pairs in ${profiler.duration / 1000}s`,
        );
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    @Lock({ name: 'cacheRouterData', verbose: true })
    async cacheRouterData(): Promise<void> {
        this.logger.log('Start refresh router owner and common tokens');
        const profiler = new PerformanceProfiler();

        const [owner, commonTokensForUserPairs] = await Promise.all([
            this.routerAbi.getOwnerRaw(),
            this.routerAbi.getCommonTokensForUserPairsRaw(),
        ]);

        const cacheKeys = await Promise.all([
            this.routerSetter.setOwner(owner),
            this.routerSetter.setCommonTokensForUserPairs(
                commonTokensForUserPairs,
            ),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        profiler.stop();
        this.logger.log(
            `Finished refresh router data in ${profiler.duration / 1000}s`,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
