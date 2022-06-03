import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { constantsConfig, elrondConfig, tokenProviderUSD } from 'src/config';
import { BigNumber } from 'bignumber.js';
import { LiquidityPosition } from '../models/pair.model';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from '../pair.utils';
import { ContextService } from 'src/services/context/context.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairGetterService } from './pair.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';

@Injectable()
export class PairService {
    constructor(
        @Inject(forwardRef(() => ContextService))
        private readonly context: ContextService,
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        private readonly wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAmountOut(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
            totalFeePercent,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
            this.pairGetterService.getPairInfoMetadata(pairAddress),
            this.pairGetterService.getTotalFeePercent(pairAddress),
        ]);

        const tokenIn =
            tokenInID === elrondConfig.EGLDIdentifier
                ? wrappedTokenID
                : tokenInID;

        switch (tokenIn) {
            case firstTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                    totalFeePercent,
                ).toFixed();
            case secondTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                    totalFeePercent,
                ).toFixed();
            default:
                return new BigNumber(0).toFixed();
        }
    }

    async getAmountIn(
        pairAddress: string,
        tokenOutID: string,
        amount: string,
    ): Promise<string> {
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
            totalFeePercent,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
            this.pairGetterService.getPairInfoMetadata(pairAddress),
            this.pairGetterService.getTotalFeePercent(pairAddress),
        ]);

        const tokenOut =
            tokenOutID === elrondConfig.EGLDIdentifier
                ? wrappedTokenID
                : tokenOutID;

        switch (tokenOut) {
            case firstTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                    totalFeePercent,
                ).toFixed();
            case secondTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                    totalFeePercent,
                ).toFixed();
            default:
                return new BigNumber(0).toFixed();
        }
    }

    async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
            this.pairGetterService.getPairInfoMetadata(pairAddress),
        ]);

        const tokenIn =
            tokenInID === elrondConfig.EGLDIdentifier
                ? wrappedTokenID
                : tokenInID;

        switch (tokenIn) {
            case firstTokenID:
                return quote(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toFixed();
            case secondTokenID:
                return quote(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toFixed();
            default:
                return new BigNumber(0).toFixed();
        }
    }

    async getLiquidityPosition(
        pairAddress: string,
        amount: string,
    ): Promise<LiquidityPosition> {
        const pairInfo = await this.pairGetterService.getPairInfoMetadata(
            pairAddress,
        );

        const firstTokenAmount = getTokenForGivenPosition(
            amount,
            pairInfo.reserves0,
            pairInfo.totalSupply,
        );
        const secondTokenAmount = getTokenForGivenPosition(
            amount,
            pairInfo.reserves1,
            pairInfo.totalSupply,
        );

        return new LiquidityPosition({
            firstTokenAmount: firstTokenAmount.toFixed(),
            secondTokenAmount: secondTokenAmount.toFixed(),
        });
    }

    async getLiquidityPositionUSD(
        pairAddress: string,
        amount: string,
    ): Promise<string> {
        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            liquidityPosition,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
            this.pairGetterService.getSecondTokenPriceUSD(pairAddress),
            this.getLiquidityPosition(pairAddress, amount),
        ]);

        return computeValueUSD(
            liquidityPosition.firstTokenAmount,
            firstToken.decimals,
            firstTokenPriceUSD,
        )
            .plus(
                computeValueUSD(
                    liquidityPosition.secondTokenAmount,
                    secondToken.decimals,
                    secondTokenPriceUSD,
                ),
            )
            .toFixed();
    }

    async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();
        if (wrappedTokenID === tokenID) {
            const pair = await this.context.getPairByTokens(
                wrappedTokenID,
                constantsConfig.USDC_TOKEN_ID,
            );
            const tokenPriceUSD = await this.pairGetterService.getFirstTokenPrice(
                pair.address,
            );
            return new BigNumber(tokenPriceUSD);
        }

        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        const graph = await this.context.getPairsMap();
        if (!graph.has(tokenID)) {
            return new BigNumber(0);
        }

        const pathTokenProviderUSD = graph
            .get(tokenID)
            .find(entry => entry === tokenProviderUSD);

        if (pathTokenProviderUSD !== undefined) {
            return await this.getPriceUSDByToken(tokenID, tokenProviderUSD);
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
        return await this.getPriceUSDByToken(tokenID, path[1]);
    }

    async getPriceUSDByToken(
        tokenID: string,
        priceProviderToken: string,
    ): Promise<BigNumber> {
        const pair = await this.context.getPairByTokens(
            tokenID,
            priceProviderToken,
        );
        const firstTokenPrice = await this.pairGetterService.getTokenPrice(
            pair.address,
            tokenID,
        );
        const priceProviderUSD = await this.pairGetterService.getTokenPriceUSD(
            priceProviderToken,
        );

        return new BigNumber(priceProviderUSD).multipliedBy(firstTokenPrice);
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

    async requireOwner(pairAddress: string, sender: string) {
        // todo: check if owner somehow
    }
}
