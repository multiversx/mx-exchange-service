import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { tokensPriceData } from 'src/config';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PairGetterService } from './pair.getter.service';
import { PairService } from './pair.service';

@Injectable()
export class PairComputeService {
    constructor(
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly priceFeed: PriceFeedService,
    ) {}

    async computeFirstTokenPrice(pairAddress: string): Promise<string> {
        const firstToken = await this.pairGetterService.getFirstToken(
            pairAddress,
        );
        const firstTokenPrice = await this.pairService.getEquivalentForLiquidity(
            pairAddress,
            firstToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );
        return new BigNumber(firstTokenPrice)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    async computeSecondTokenPrice(pairAddress: string): Promise<string> {
        const secondToken = await this.pairGetterService.getSecondToken(
            pairAddress,
        );
        const secondTokenPrice = await this.pairService.getEquivalentForLiquidity(
            pairAddress,
            secondToken.identifier,
            new BigNumber(`1e${secondToken.decimals}`).toFixed(),
        );
        return new BigNumber(secondTokenPrice)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [secondToken, lpToken, firstTokenPrice] = await Promise.all([
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getLpToken(pairAddress),
            this.pairGetterService.getFirstTokenPrice(pairAddress),
        ]);
        const [secondTokenPriceUSD, lpTokenPosition] = await Promise.all([
            this.computeTokenPriceUSD(secondToken.identifier),
            this.pairService.getLiquidityPosition(
                pairAddress,
                new BigNumber(`1e${lpToken.decimals}`).toFixed(),
            ),
        ]);

        const lpTokenPrice = new BigNumber(firstTokenPrice)
            .multipliedBy(new BigNumber(lpTokenPosition.firstTokenAmount))
            .plus(new BigNumber(lpTokenPosition.secondTokenAmount));
        const lpTokenPriceDenom = lpTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();

        return new BigNumber(lpTokenPriceDenom)
            .multipliedBy(secondTokenPriceUSD)
            .toFixed();
    }

    async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        if (tokensPriceData.has(tokenID)) {
            return this.priceFeed.getTokenPrice(tokensPriceData.get(tokenID));
        }

        const usdPrice = await this.pairService.getPriceUSDByPath(tokenID);

        return usdPrice;
    }
}
