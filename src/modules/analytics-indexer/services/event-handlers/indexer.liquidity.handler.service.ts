import { Injectable } from '@nestjs/common';
import {
    AddLiquidityEvent,
    RemoveLiquidityEvent,
} from '@multiversx/sdk-exchange';
import { computeValueUSD } from 'src/utils/token.converters';
import { GlobalState } from '../../global.state';
import { IndexerStateService } from '../indexer.state.service';
import { IndexerPairService } from '../indexer.pair.service';
import { IndexerRouterService } from '../indexer.router.service';
import { IndexerTokenService } from '../indexer.token.service';

@Injectable()
export class IndexerLiquidityHandlerService {
    constructor(
        private readonly stateService: IndexerStateService,
        private readonly pairService: IndexerPairService,
        private readonly routerService: IndexerRouterService,
        private readonly tokenService: IndexerTokenService,
    ) {}

    public handleLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): [any[], number] {
        const pair = this.stateService.getPairMetadata(event.address);
        if (!pair) {
            return [[], 0];
        }

        this.updatePairStateForLiquidityEvent(event);

        const firstTokenPriceUSD =
            this.tokenService.computeTokenPriceDerivedUSD(
                event.getFirstToken().tokenID,
            );
        const secondTokenPriceUSD =
            this.tokenService.computeTokenPriceDerivedUSD(
                event.getSecondToken().tokenID,
            );
        const newTotalLockedValueUSD =
            this.routerService.computeTotalLockedValueUSD();

        const data = [];
        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
        };
        const firstTokenLockedValueUSD = computeValueUSD(
            event.getFirstTokenReserves().toFixed(),
            pair.firstToken.decimals,
            firstTokenPriceUSD,
        );
        const secondTokenLockedValueUSD = computeValueUSD(
            event.getSecondTokenReserves().toFixed(),
            pair.secondToken.decimals,
            secondTokenPriceUSD,
        );
        const lockedValueUSD = firstTokenLockedValueUSD.plus(
            secondTokenLockedValueUSD,
        );

        data[event.address] = {
            firstTokenLocked: event.getFirstTokenReserves().toFixed(),
            firstTokenLockedValueUSD: firstTokenLockedValueUSD.toFixed(),
            secondTokenLocked: event.getSecondTokenReserves().toFixed(),
            secondTokenLockedValueUSD: secondTokenLockedValueUSD.toFixed(),
            lockedValueUSD: lockedValueUSD.toFixed(),
            liquidity: event.getLiquidityPoolSupply().toFixed(),
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
        };
        data[pair.secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                pair.secondToken.decimals,
                secondTokenPriceUSD,
            ).toFixed(),
        };

        return [data, event.getTimestamp().toNumber()];
    }

    private updatePairStateForLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): void {
        GlobalState.pairsState[event.address] = {
            firstTokenID: event.getFirstToken().tokenID,
            secondTokenID: event.getSecondToken().tokenID,
            firstTokenReserves: event.getFirstTokenReserves().toString(),
            secondTokenReserves: event.getSecondTokenReserves().toString(),
            liquidityPoolSupply: event.getLiquidityPoolSupply().toString(),
        };
    }
}
