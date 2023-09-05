import {
    CreatePairEvent,
    PairSwapEnabledEvent,
    ROUTER_EVENTS,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { RouterSetterService } from '../../router/services/router.setter.service';
import { CreateTokenDto } from '../../tokens/dto/create.token.dto';
import { TokenRepositoryService } from '../../tokens/services/token.repository.service';
import { TokenService } from '../../tokens/services/token.service';
import { TokenSetterService } from '../../tokens/services/token.setter.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';

@Injectable()
export class RouterHandlerService {
    constructor(
        private readonly routerAbiService: RouterAbiService,
        private readonly routerSetterService: RouterSetterService,
        private readonly pairAbi: PairAbiService,
        private readonly pairSetter: PairSetterService,
        private readonly tokenService: TokenService,
        private readonly tokenSetter: TokenSetterService,
        private readonly tokenRepository: TokenRepositoryService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
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
            commonTokens,
        ] = await Promise.all([
            this.routerAbiService.getPairsMetadataRaw(),
            this.routerAbiService.getAllPairsAddressRaw(),
            this.tokenService.getEsdtTokenType(firstTokenID),
            this.tokenService.getEsdtTokenType(secondTokenID),
            this.tokenService.getUniqueTokenIDs(true),
            this.routerAbiService.commonTokensForUserPairs(),
        ]);

        if (
            commonTokens.includes(firstTokenID) ||
            commonTokens.includes(secondTokenID)
        ) {
            if (firstTokenType === 'Unlisted') {
                const createTokenDto: CreateTokenDto = {
                    tokenID: firstTokenID,
                    type: 'Experimental',
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
                    type: 'Experimental',
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

    async handlePairSwapEnabledEvent(
        event: PairSwapEnabledEvent,
    ): Promise<void> {
        const pairAddress = event.getPairAddress().bech32();
        const state = await this.pairAbi.getStateRaw(pairAddress);
        const cacheKey = await this.pairSetter.setState(pairAddress, state);

        await this.deleteCacheKeys([cacheKey]);

        await this.pubSub.publish(ROUTER_EVENTS.PAIR_SWAP_ENABLED, {
            pairSwapEnabledEvent: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
