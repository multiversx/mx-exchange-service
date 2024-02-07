import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { MetabondingAbiService } from 'src/modules/metabonding/services/metabonding.abi.service';
import { MetabondingSetterService } from 'src/modules/metabonding/services/metabonding.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class MetabondingCacheWarmerService {
    constructor(
        private readonly metabondingAbi: MetabondingAbiService,
        private readonly metabondingSetter: MetabondingSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheMetabonding(): Promise<void> {
        if (process.env.NODE_ENV !== 'mainnet') {
            return;
        }

        const lockedAssetTokenID =
            await this.metabondingAbi.getLockedAssetTokenIDRaw();
        const invalidatedKeys = await Promise.all([
            this.metabondingSetter.setLockedAssetTokenID(lockedAssetTokenID),
        ]);
        await this.deleteCacheKeys(invalidatedKeys);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheMetabondingInfo(): Promise<void> {
        if (process.env.NODE_ENV !== 'mainnet') {
            return;
        }

        const lockedAssetsSupply =
            await this.metabondingAbi.getTotalLockedAssetSupplyRaw();
        const invalidatedKeys = await Promise.all([
            this.metabondingSetter.setTotalLockedAssetSupply(
                lockedAssetsSupply,
            ),
        ]);
        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
