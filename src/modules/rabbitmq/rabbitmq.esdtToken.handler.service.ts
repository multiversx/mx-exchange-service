import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { EsdtLocalBurnEvent } from './entities/esdtToken/esdtLocalBurn.event';
import { EsdtLocalMintEvent } from './entities/esdtToken/esdtLocalMint.event';

@Injectable()
export class RabbitMQEsdtTokenHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleEsdtTokenEvent(
        event: EsdtLocalMintEvent | EsdtLocalBurnEvent,
    ): Promise<void> {
        const cacheKey = generateCacheKeyFromParams(
            'context',
            event.getTopics().tokenID,
        );
        const token = await this.apiService
            .getService()
            .getToken(event.getTopics().tokenID);
        await this.cachingService.setCache(cacheKey, token, oneHour());
        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
        console.log(event.getTopics());
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
