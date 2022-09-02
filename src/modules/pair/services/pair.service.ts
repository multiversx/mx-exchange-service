import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { elrondConfig } from 'src/config';
import { BigNumber } from 'bignumber.js';
import { LiquidityPosition } from '../models/pair.model';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from '../pair.utils';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairGetterService } from './pair.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { CachingService } from 'src/services/caching/cache.service';
import { oneHour } from 'src/helpers/helpers';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';

@Injectable()
export class PairService {
    constructor(
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetter: RouterGetterService,
        @Inject(forwardRef(() => WrapService))
        private readonly wrapService: WrapService,
        private readonly cachingService: CachingService,
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
    ): Promise<BigNumber> {
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
                return quote(amount, pairInfo.reserves0, pairInfo.reserves1);
            case secondTokenID:
                return quote(amount, pairInfo.reserves1, pairInfo.reserves0);
            default:
                return new BigNumber(0);
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

    async getPairAddressByLpTokenID(tokenID: string): Promise<string | null> {
        const cachedValue: string = await this.cachingService.getCache(
            `${tokenID}.pairAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        const pairsAddress = await this.routerGetter.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress =>
            this.pairGetterService.getLpTokenID(pairAddress),
        );
        const lpTokenIDs = await Promise.all(promises);
        for (let index = 0; index < lpTokenIDs.length; index++) {
            if (lpTokenIDs[index] === tokenID) {
                await this.cachingService.setCache(
                    `${tokenID}.pairAddress`,
                    pairsAddress[index],
                    oneHour(),
                );
                return pairsAddress[index];
            }
        }

        return null;
    }

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        const pairsAddress = await this.routerGetter.getAllPairsAddress();
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
