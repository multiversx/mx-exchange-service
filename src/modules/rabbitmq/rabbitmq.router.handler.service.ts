import { CreatePairEvent, ROUTER_EVENTS } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { AbiRouterService } from '../router/services/abi.router.service';
import { RouterSetterService } from '../router/services/router.setter.service';

@Injectable()
export class RabbitMQRouterHandlerService {
    private invalidatedKeys = [];
    constructor(
        private readonly routerAbiService: AbiRouterService,
        private readonly routerSetterService: RouterSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleCreatePairEvent(event: CreatePairEvent): Promise<void> {
        const [pairsMetadata, pairsAddresses] = await Promise.all([
            this.routerAbiService.getPairsMetadata(),
            this.routerAbiService.getAllPairsAddress(),
            this.routerAbiService.getAllPairTokens(),
            this.routerAbiService.getAllPairsManagedAddresses(),
        ]);
        const keys = await Promise.all([
            this.routerSetterService.setPairsMetadata(pairsMetadata),
            this.routerSetterService.setAllPairsAddress(pairsAddresses),
            this.routerSetterService.setAllPairTokens(pairsAddresses),
            this.routerSetterService.setAllPairsManagedAddresses(
                pairsAddresses,
            ),
        ]);
        this.invalidatedKeys.push(...keys);
        await this.deleteCacheKeys();

        await this.pubSub.publish(ROUTER_EVENTS.CREATE_PAIR, {
            createPairEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
