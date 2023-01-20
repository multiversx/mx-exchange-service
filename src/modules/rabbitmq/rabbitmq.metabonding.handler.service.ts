import { MetabondingEvent } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { MetabondingSetterService } from '../metabonding/services/metabonding.setter.service';

@Injectable()
export class RabbitMQMetabondingHandlerService {
    constructor(
        private readonly metabondingSetter: MetabondingSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleMetabondingEvent(event: MetabondingEvent): Promise<void> {
        const userEntry = event.getUserEntry();
        const caller = event.getTopics().getCaller();

        const invalidatedKeys = await this.metabondingSetter.setUserEntry(
            caller.bech32(),
            userEntry,
        );
        await this.deleteCacheKeys([invalidatedKeys]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
