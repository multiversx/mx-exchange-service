import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { elrondConfig, tokenProviderUSD, tokensPriceData } from 'src/config';
import { BigNumber } from 'bignumber.js';
import { LiquidityPosition, TemporaryFundsModel } from '../models/pair.model';
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
import { AbiPairService } from './abi-pair.service';

@Injectable()
export class PairService {
    constructor(
        private readonly context: ContextService,
        private readonly abiService: AbiPairService,
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

    async getTemporaryFunds(
        callerAddress: string,
    ): Promise<TemporaryFundsModel[]> {
        const pairsMetadata = await this.context.getPairsMetadata();

        const temporaryFunds: TemporaryFundsModel[] = [];

        for (const pairMetadata of pairsMetadata) {
            const [
                firstToken,
                secondToken,
                temporaryFundsFirstToken,
                temporaryFundsSecondToken,
            ] = await Promise.all([
                this.pairGetterService.getFirstToken(pairMetadata.address),
                this.pairGetterService.getSecondToken(pairMetadata.address),
                this.abiService.getTemporaryFunds(
                    pairMetadata.address,
                    callerAddress,
                    pairMetadata.firstTokenID,
                ),
                this.abiService.getTemporaryFunds(
                    pairMetadata.address,
                    callerAddress,
                    pairMetadata.secondTokenID,
                ),
            ]);

            if (
                temporaryFundsFirstToken.isZero() &&
                temporaryFundsSecondToken.isZero()
            ) {
                continue;
            }

            const temporaryFundsPair = new TemporaryFundsModel({
                pairAddress: pairMetadata.address,
            });

            if (!temporaryFundsFirstToken.isZero()) {
                temporaryFundsPair.firstToken = firstToken;
                temporaryFundsPair.firstAmount = temporaryFundsFirstToken.toFixed();
            }

            if (!temporaryFundsSecondToken.isZero()) {
                temporaryFundsPair.secondToken = secondToken;
                temporaryFundsPair.secondAmount = temporaryFundsSecondToken.toFixed();
            }

            temporaryFunds.push(temporaryFundsPair);
        }

        return temporaryFunds;
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
