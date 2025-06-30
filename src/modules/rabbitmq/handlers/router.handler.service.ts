import {
    CreatePairEvent,
    MultiPairSwapEvent,
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
import BigNumber from 'bignumber.js';
import { computeValueUSD } from 'src/utils/token.converters';
import { SwapEventPairData } from 'src/modules/trading-contest/types';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

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
        private readonly tokenCompute: TokenComputeService,
        private readonly dataApi: MXDataApiService,
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

    async handleMultiPairSwapEvent(
        event: MultiPairSwapEvent,
    ): Promise<SwapEventPairData> {
        const [tokensMetadata, tokensPriceUSD, commonTokensIDs, usdcPrice] =
            await Promise.all([
                this.tokenService.getAllBaseTokensMetadata([
                    event.getTopics().tokenInID,
                    event.getTopics().tokenOutID,
                ]),
                this.tokenCompute.getAllTokensPriceDerivedUSD([
                    event.getTopics().tokenInID,
                    event.getTopics().tokenOutID,
                ]),
                this.routerAbiService.commonTokensForUserPairs(),
                this.dataApi.getTokenPrice('USDC'),
            ]);

        const [tokenInPriceUSD, tokenOutPriceUSD] = tokensPriceUSD;

        const [tokenIn, tokenOut] = tokensMetadata;

        const tokenInVolumeUSD = computeValueUSD(
            event.toJSON().amountIn,
            tokenIn.decimals,
            tokenInPriceUSD,
        ).dividedBy(usdcPrice);
        const tokenOutVolumeUSD = computeValueUSD(
            event.toJSON().amountOut,
            tokenOut.decimals,
            tokenOutPriceUSD,
        ).dividedBy(usdcPrice);

        let volumeUSD: BigNumber;
        if (
            commonTokensIDs.includes(tokenIn.identifier) &&
            commonTokensIDs.includes(tokenOut.identifier)
        ) {
            volumeUSD = tokenInVolumeUSD.plus(tokenOutVolumeUSD).dividedBy(2);
        } else if (
            commonTokensIDs.includes(tokenIn.identifier) &&
            !commonTokensIDs.includes(tokenOut.identifier)
        ) {
            volumeUSD = tokenInVolumeUSD;
        } else if (
            !commonTokensIDs.includes(tokenIn.identifier) &&
            commonTokensIDs.includes(tokenOut.identifier)
        ) {
            volumeUSD = tokenOutVolumeUSD;
        } else {
            volumeUSD = new BigNumber(0);
        }

        return {
            volumeUSD: volumeUSD.toFixed(),
            feesUSD: '0',
        };
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
