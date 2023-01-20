import { UserUnlockedTokensEvent } from '@multiversx/sdk-exchange';
import { Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { UnstakePairModel } from 'src/modules/token-unstake/models/token.unstake.model';
import { TokenUnstakeSetterService } from 'src/modules/token-unstake/services/token.unstake.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

export class TokenUnstakeHandlerService {
    constructor(
        private readonly tokenUnstakeSetter: TokenUnstakeSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleUnlockedTokens(event: UserUnlockedTokensEvent): Promise<void> {
        const cacheKey = await this.tokenUnstakeSetter.setUnlockedTokensForUser(
            event.decodedTopics.caller.bech32(),
            event.unstakeTokens.map(
                (unstakePair) => new UnstakePairModel(unstakePair.toJSON()),
            ),
        );
        await this.deleteCacheKeys([cacheKey]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
