import { SwapEvent } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { computeValueUSD } from 'src/utils/token.converters';
import { GlobalState } from '../../global.state';
import { StateService } from '../state.service';
import { IndexerPairService } from '../pair.service';
import { IndexerRouterService } from '../router.service';

@Injectable()
export class IndexerSwapHandlerService {
    constructor(
        private readonly stateService: StateService,
        private readonly pairService: IndexerPairService,
        private readonly routerService: IndexerRouterService,
    ) {}

    public handleSwapEvents(event: SwapEvent): [any[], number] {
        try {
            const pair = this.stateService.getPairMetadata(event.address);
            if (!pair) {
                return [[], 0];
            }

            this.updateState(event);

            const [
                firstTokenAmount,
                secondTokenAmount,
                firstTokenReserve,
                secondTokenReserve,
            ] =
                event.getTokenIn().tokenID === pair.firstToken.identifier
                    ? [
                          event.getTokenIn().amount.toFixed(),
                          event.getTokenOut().amount.toFixed(),
                          event.getTokenInReserves().toFixed(),
                          event.getTokenOutReserves().toFixed(),
                      ]
                    : [
                          event.getTokenOut().amount.toFixed(),
                          event.getTokenIn().amount.toFixed(),
                          event.getTokenOutReserves().toFixed(),
                          event.getTokenInReserves().toFixed(),
                      ];
            const firstTokenPrice = this.pairService.computeFirstTokenPrice(
                event.address,
            );
            const secondTokenPrice = this.pairService.computeSecondTokenPrice(
                event.address,
            );
            const firstTokenPriceUSD =
                this.pairService.computeFirstTokenPriceUSD(event.address);
            const secondTokenPriceUSD =
                this.pairService.computeSecondTokenPriceUSD(event.address);
            const liquidity = this.pairService.getTotalSupply(event.address);

            const newTotalLockedValueUSD =
                this.routerService.computeTotalLockedValueUSD();

            const firstTokenValues = {
                firstTokenPrice,
                firstTokenLocked: firstTokenReserve,
                firstTokenLockedValueUSD: computeValueUSD(
                    firstTokenReserve,
                    pair.firstToken.decimals,
                    firstTokenPriceUSD,
                ).toFixed(),
                firstTokenVolume: firstTokenAmount,
            };
            const secondTokenValues = {
                secondTokenPrice,
                secondTokenLocked: secondTokenReserve,
                secondTokenLockedValueUSD: computeValueUSD(
                    secondTokenReserve,
                    pair.secondToken.decimals,
                    secondTokenPriceUSD,
                ).toFixed(),
                secondTokenVolume: secondTokenAmount,
            };

            const lockedValueUSD = new BigNumber(
                firstTokenValues.firstTokenLockedValueUSD,
            )
                .plus(secondTokenValues.secondTokenLockedValueUSD)
                .toFixed();

            const firstTokenVolumeUSD = computeValueUSD(
                firstTokenValues.firstTokenVolume,
                pair.firstToken.decimals,
                firstTokenPriceUSD,
            );
            const secondTokenVolumeUSD = computeValueUSD(
                secondTokenValues.secondTokenVolume,
                pair.secondToken.decimals,
                secondTokenPriceUSD,
            );
            const volumeUSD = firstTokenVolumeUSD
                .plus(secondTokenVolumeUSD)
                .dividedBy(2);

            const feesUSD =
                event.getTokenIn().tokenID === pair.firstToken.identifier
                    ? computeValueUSD(
                          firstTokenAmount,
                          pair.firstToken.decimals,
                          firstTokenPriceUSD,
                      ).times(pair.totalFeePercent)
                    : computeValueUSD(
                          secondTokenAmount,
                          pair.secondToken.decimals,
                          secondTokenPriceUSD,
                      ).times(pair.totalFeePercent);

            const data = [];
            data[event.address] = {
                ...firstTokenValues,
                ...secondTokenValues,
                lockedValueUSD,
                liquidity,
                volumeUSD: volumeUSD.toFixed(),
                feesUSD: feesUSD.toFixed(),
            };

            const firstTokenTotalLockedValue =
                this.pairService.getTokenTotalLockedValue(
                    pair.firstToken.identifier,
                );
            const secondTokenTotalLockedValue =
                this.pairService.getTokenTotalLockedValue(
                    pair.secondToken.identifier,
                );

            data[pair.firstToken.identifier] = {
                lockedValue: firstTokenTotalLockedValue,
                lockedValueUSD: computeValueUSD(
                    firstTokenTotalLockedValue,
                    pair.firstToken.decimals,
                    firstTokenPriceUSD,
                ).toFixed(),
                priceUSD: firstTokenPriceUSD,
                volume: firstTokenAmount,
                volumeUSD: firstTokenVolumeUSD.toFixed(),
            };
            data[pair.secondToken.identifier] = {
                lockedValue: secondTokenTotalLockedValue,
                lockedValueUSD: computeValueUSD(
                    secondTokenTotalLockedValue,
                    pair.secondToken.decimals,
                    secondTokenPriceUSD,
                ).toFixed(),
                priceUSD: secondTokenPriceUSD,
                volume: secondTokenAmount,
                volumeUSD: secondTokenVolumeUSD.toFixed(),
            };

            data['factory'] = {
                totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
            };

            return [data, event.getTimestamp().toNumber()];
        } catch (error) {
            throw error;
        }
    }

    private updateState(event: SwapEvent): void {
        const firstToken = this.stateService.getFirstToken(event.address);

        if (!GlobalState.pairsState[event.address]) {
            GlobalState.pairsState[event.address] = {
                firstTokenID: firstToken.identifier,
                secondTokenID: '',
                firstTokenReserves: '0',
                secondTokenReserves: '0',
                liquidityPoolSupply: '0',
            };
        }

        if (
            GlobalState.pairsState[event.address].firstTokenID ===
            event.getTokenIn().tokenID
        ) {
            GlobalState.pairsState[event.address] = {
                firstTokenID: event.getTokenIn().tokenID,
                secondTokenID: event.getTokenOut().tokenID,
                firstTokenReserves: event.getTokenInReserves().toString(),
                secondTokenReserves: event.getTokenOutReserves().toString(),
                liquidityPoolSupply:
                    GlobalState.pairsState[event.address]
                        ?.liquidityPoolSupply ?? '0',
            };
        } else {
            GlobalState.pairsState[event.address] = {
                firstTokenID: event.getTokenOut().tokenID,
                secondTokenID: event.getTokenIn().tokenID,
                firstTokenReserves: event.getTokenOutReserves().toString(),
                secondTokenReserves: event.getTokenInReserves().toString(),
                liquidityPoolSupply:
                    GlobalState.pairsState[event.address]
                        ?.liquidityPoolSupply ?? '0',
            };
        }
    }
}
