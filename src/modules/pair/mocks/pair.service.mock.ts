import { Inject } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { tokenProviderUSD, tokensPriceData } from 'src/config';
import { ContextService } from 'src/services/context/context.service';
import { LiquidityPosition } from '../models/pair.model';
import { PairGetterService } from '../services/pair.getter.service';

export class PairServiceMock {
    constructor(
        @Inject(ContextService)
        private readonly context: ContextService,
        @Inject(PairGetterService)
        private readonly pairGetterService: PairGetterService,
    ) {}

    async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        return '2000000000000000000';
    }

    async getLiquidityPosition(
        pairAddress: string,
        amount: string,
    ): Promise<LiquidityPosition> {
        return new LiquidityPosition({
            firstTokenAmount: '1000000000000000000',
            secondTokenAmount: '2000000000000000000',
        });
    }

    async getLiquidityPositionUSD(
        pairAddress: string,
        amount: string,
    ): Promise<string> {
        return amount !== '0' ? '150' : '0';
    }

    async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        if (!tokensPriceData.has(tokenProviderUSD)) {
            return new BigNumber(0);
        }

        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        const graph = await this.context.getPairsMap();
        if (!graph.has(tokenID)) {
            return new BigNumber(0);
        }

        for (const edge of graph.keys()) {
            discovered.set(edge, false);
        }
        this.context.isConnected(
            graph,
            tokenID,
            tokenProviderUSD,
            discovered,
            path,
        );

        if (path.length === 0) {
            return new BigNumber(0);
        }

        const pair = await this.context.getPairByTokens(tokenID, path[1]);
        const firstTokenPrice = await this.pairGetterService.getTokenPrice(
            pair.address,
            tokenID,
        );
        const secondTokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
            pair.address,
            path[1],
        );
        return new BigNumber(firstTokenPrice).multipliedBy(secondTokenPriceUSD);
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string | null> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const lpTokenID = await this.pairGetterService.getLpTokenID(
                pairAddress,
            );
            return { lpTokenID: lpTokenID, pairAddress: pairAddress };
        });
        const pairs = await Promise.all(promises);
        const pair = pairs.find(pair => pair.lpTokenID === tokenID);
        return pair?.pairAddress;
    }

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        const pairsAddress = await this.context.getAllPairsAddress();
        for (const pairAddress of pairsAddress) {
            const [firstTokenID, secondTokenID, lpTokenID] = await Promise.all([
                this.pairGetterService.getFirstTokenID(pairAddress),
                this.pairGetterService.getSecondTokenID(pairAddress),
                this.pairGetterService.getLpTokenID(pairAddress),
            ]);

            if (
                tokenID === firstTokenID ||
                tokenID === secondTokenID ||
                tokenID === lpTokenID
            ) {
                return true;
            }
        }
        return false;
    }
}
