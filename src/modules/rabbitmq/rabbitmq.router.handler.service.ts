import { CreatePairEvent, ROUTER_EVENTS } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { AbiRouterService } from '../router/services/abi.router.service';
import { RouterSetterService } from '../router/services/router.setter.service';
import { CreateTokenDto } from '../tokens/dto/create.token.dto';
import { TokenGetterService } from '../tokens/services/token.getter.service';
import { TokenRepositoryService } from '../tokens/services/token.repository.service';
import { TokenSetterService } from '../tokens/services/token.setter.service';

@Injectable()
export class RabbitMQRouterHandlerService {
    private invalidatedKeys = [];
    constructor(
        private readonly routerAbiService: AbiRouterService,
        private readonly routerSetterService: RouterSetterService,
        private readonly tokenGetter: TokenGetterService,
        private readonly tokenSetter: TokenSetterService,
        private readonly tokenRepository: TokenRepositoryService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleCreatePairEvent(event: CreatePairEvent): Promise<void> {
        const [firstTokenID, secondTokenID] = [
            event.toJSON().firstTokenID,
            event.toJSON().secondTokenID,
        ];
        const [
            pairsMetadata,
            pairsAddresses,
            firstTokenType,
            secondTokenType,
        ] = await Promise.all([
            this.routerAbiService.getPairsMetadata(),
            this.routerAbiService.getAllPairsAddress(),
            this.tokenGetter.getEsdtTokenType(firstTokenID),
            this.tokenGetter.getEsdtTokenType(secondTokenID),
        ]);

        if (
            firstTokenID === constantsConfig.USDC_TOKEN_ID ||
            secondTokenID === constantsConfig.USDC_TOKEN_ID
        ) {
            if (firstTokenType === 'Unlisted') {
                const createTokenDto: CreateTokenDto = {
                    tokenID: firstTokenID,
                    type: 'Jungle',
                };
                await this.tokenRepository.create(createTokenDto);
                await this.tokenSetter.setEsdtTokenType(
                    createTokenDto.tokenID,
                    createTokenDto.type,
                );
            }

            if (secondTokenType === 'Unlisted') {
                const createTokenDto: CreateTokenDto = {
                    tokenID: secondTokenID,
                    type: 'Jungle',
                };
                await this.tokenRepository.create(createTokenDto);
                await this.tokenSetter.setEsdtTokenType(
                    createTokenDto.tokenID,
                    createTokenDto.type,
                );
            }
        }

        const keys = await Promise.all([
            this.routerSetterService.setPairsMetadata(pairsMetadata),
            this.routerSetterService.setAllPairsAddress(pairsAddresses),
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
