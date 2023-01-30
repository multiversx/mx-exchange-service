import { CreatePairEvent, ROUTER_EVENTS } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { AbiRouterService } from '../router/services/abi.router.service';
import { RouterSetterService } from '../router/services/router.setter.service';
import { CreateTokenDto } from '../tokens/dto/create.token.dto';
import { TokenGetterService } from '../tokens/services/token.getter.service';
import { TokenRepositoryService } from '../tokens/services/token.repository.service';
import { TokenService } from '../tokens/services/token.service';
import { TokenSetterService } from '../tokens/services/token.setter.service';

@Injectable()
export class RabbitMQRouterHandlerService {
    constructor(
        private readonly routerAbiService: AbiRouterService,
        private readonly routerSetterService: RouterSetterService,
        private readonly tokenGetter: TokenGetterService,
        private readonly tokenService: TokenService,
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
            uniqueTokens,
        ] = await Promise.all([
            this.routerAbiService.getPairsMetadata(),
            this.routerAbiService.getAllPairsAddress(),
            this.tokenGetter.getEsdtTokenType(firstTokenID),
            this.tokenGetter.getEsdtTokenType(secondTokenID),
            this.tokenService.getUniqueTokenIDs(true),
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
            this.routerSetterService.setPairCount(pairsAddresses.length),
        ]);

        for (const token of uniqueTokens) {
            keys.push(
                ...[
                    generateCacheKeyFromParams(
                        'auto.route.paths',
                        firstTokenID,
                        token,
                    ),
                    generateCacheKeyFromParams(
                        'auto.route.paths',
                        secondTokenID,
                        token,
                    ),
                    generateCacheKeyFromParams(
                        'auto.route.paths',
                        token,
                        firstTokenID,
                    ),
                    generateCacheKeyFromParams(
                        'auto.route.paths',
                        token,
                        secondTokenID,
                    ),
                ],
            );
        }

        await this.deleteCacheKeys(keys);

        await this.pubSub.publish(ROUTER_EVENTS.CREATE_PAIR, {
            createPairEvent: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
