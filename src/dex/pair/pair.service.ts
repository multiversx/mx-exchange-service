import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { tokensPriceData } from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { LiquidityPosition, TokenModel } from '../models/pair.model';
import { ContextService } from '../utils/context.service';
import { RedlockService } from '../../services';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from './pair.utils';
import { CachePairService } from '../../services/cache-manager/cache-pair.service';
import { AbiPairService } from './abi-pair.service';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';

@Injectable()
export class PairService {
    constructor(
        private abiService: AbiPairService,
        private cacheService: CachePairService,
        private context: ContextService,
        private redlockService: RedlockService,
        private priceFeed: PriceFeedService,
    ) {}

    async getFirstToken(pairAddress: string): Promise<TokenModel> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return await this.context.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<TokenModel> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return await this.context.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<TokenModel> {
        const lpTokenID = await this.getLpTokenID(pairAddress);

        return await this.context.getTokenMetadata(lpTokenID);
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return await this.getEquivalentForLiquidity(
            pairAddress,
            firstTokenID,
            '1',
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return await this.getEquivalentForLiquidity(
            pairAddress,
            secondTokenID,
            '1',
        );
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return await this.getTokenPriceUSD(pairAddress, firstTokenID);
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return await this.getTokenPriceUSD(pairAddress, secondTokenID);
    }

    async getLpTokenSecondTokenEquivalent(
        pairAddress: string,
    ): Promise<string> {
        const lpTokenPosition = await this.getLiquidityPosition(
            pairAddress,
            '1',
        );
        const lpTokenFirstAmountPrice = await this.getFirstTokenPrice(
            pairAddress,
        );
        const lpTokenPrice = new BigNumber(lpTokenFirstAmountPrice)
            .multipliedBy(new BigNumber(lpTokenPosition.firstTokenAmount))
            .plus(new BigNumber(lpTokenPosition.secondTokenAmount));
        return lpTokenPrice.toString();
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const lpTokenEquivalent = await this.getLpTokenSecondTokenEquivalent(
            pairAddress,
        );
        const secondTokenPriceUSD = await this.getSecondTokenPriceUSD(
            pairAddress,
        );
        return new BigNumber(lpTokenEquivalent)
            .multipliedBy(secondTokenPriceUSD)
            .toString();
    }

    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        if (tokensPriceData.has(tokenID)) {
            return (
                await this.priceFeed.getTokenPrice(tokensPriceData.get(tokenID))
            ).toString();
        }

        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        let tokenPrice: string;
        let tokenPriceUSD;
        let usdPrice;

        switch (tokenID) {
            case firstTokenID:
                tokenPrice = await this.getFirstTokenPrice(pairAddress);
                if (tokensPriceData.has(secondTokenID)) {
                    const usdPrice = (
                        await this.priceFeed.getTokenPrice(
                            tokensPriceData.get(secondTokenID),
                        )
                    ).toString();
                    const tokenPriceUSD = new BigNumber(tokenPrice)
                        .multipliedBy(usdPrice)
                        .toString();
                    return tokenPriceUSD;
                }

                usdPrice = await this.getPriceUSDByPath(tokenID);
                tokenPriceUSD = new BigNumber(tokenPrice)
                    .multipliedBy(usdPrice)
                    .toString();
                return tokenPriceUSD;

            case secondTokenID:
                tokenPrice = await this.getSecondTokenPrice(pairAddress);
                if (tokensPriceData.has(firstTokenID)) {
                    const usdPrice = (
                        await this.priceFeed.getTokenPrice(
                            tokensPriceData.get(firstTokenID),
                        )
                    ).toString();
                    const tokenPriceUSD = new BigNumber(tokenPrice)
                        .multipliedBy(usdPrice)
                        .toString();
                    return tokenPriceUSD;
                }

                usdPrice = await this.getPriceUSDByPath(tokenID);
                tokenPriceUSD = new BigNumber(tokenPrice)
                    .multipliedBy(usdPrice)
                    .toString();
                return tokenPriceUSD;
        }

        return '';
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cachePairsInfo(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        for (const pairAddress of pairsAddress) {
            const resource = `${pairAddress}.pairInfo`;
            const lockExpire = 40;
            let lock;

            try {
                lock = await this.redlockService.lockTryOnce(
                    resource,
                    lockExpire,
                );
            } catch (e) {
                return;
            }
            if (lock === 0) {
                return;
            }

            await this.getPairInfoMetadata(pairAddress);
        }
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const pairInfo = await this.abiService.getPairInfoMetadata(pairAddress);

        this.cacheService.setReserves(pairAddress, firstTokenID, {
            reserves: pairInfo.reserves0,
        });
        this.cacheService.setReserves(pairAddress, secondTokenID, {
            reserves: pairInfo.reserves1,
        });
        this.cacheService.setTotalSupply(pairAddress, {
            totalSupply: pairInfo.totalSupply,
        });

        return pairInfo;
    }

    async getPairInfo(pairAddress: string): Promise<PairInfoModel> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);

        const cachedFirstReserve = await this.cacheService.getReserves(
            pairAddress,
            firstTokenID,
        );
        const cachedSecondReserve = await this.cacheService.getReserves(
            pairAddress,
            secondTokenID,
        );
        const cachedTotalSupply = await this.cacheService.getTotalSupply(
            pairAddress,
        );

        if (
            !!cachedFirstReserve &&
            !!cachedSecondReserve &&
            !!cachedTotalSupply
        ) {
            const pairInfo = {
                reserves0: cachedFirstReserve.reserves,
                reserves1: cachedSecondReserve.reserves,
                totalSupply: cachedTotalSupply.totalSupply,
            };
            return this.pairInfoDenom(pairAddress, pairInfo);
        }

        const pairInfo = await this.getPairInfoMetadata(pairAddress);
        return await this.pairInfoDenom(pairAddress, pairInfo);
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.abiService.getContract(pairAddress);
        return await this.context.getState(contract);
    }

    async getAmountOut(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        switch (tokenInID) {
            case firstTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toString();
            case secondTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toString();
            default:
                return;
        }
    }

    async getAmountIn(
        pairAddress: string,
        tokenOutID: string,
        amount: string,
    ): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        switch (tokenOutID) {
            case firstTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toString();
            case secondTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toString();
            default:
                return;
        }
    }

    async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const pairInfo = await this.getPairInfo(pairAddress);

        switch (tokenInID) {
            case firstTokenID:
                return quote(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toString();
            case secondTokenID:
                return quote(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toString();
            default:
                return;
        }
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        const cachedData = await this.cacheService.getTemporaryFunds(
            pairAddress,
            callerAddress,
            tokenID,
        );
        if (!!cachedData) {
            return cachedData.temporaryFunds;
        }

        const temporaryFunds = await this.abiService.getTemporaryFunds(
            pairAddress,
            callerAddress,
            tokenID,
        );
        this.cacheService.setTemporaryFunds(
            pairAddress,
            callerAddress,
            tokenID,
            { temporaryFunds: temporaryFunds },
        );

        return temporaryFunds;
    }

    async getLiquidityPosition(
        pairAddress: string,
        amount: string,
    ): Promise<LiquidityPosition> {
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

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

        return {
            firstTokenAmount: firstTokenAmount.toString(),
            secondTokenAmount: secondTokenAmount.toString(),
        };
    }

    private async getFirstTokenID(pairAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFirstTokenID(pairAddress);
        if (!!cachedData) {
            return cachedData.firstTokenID;
        }

        const firstTokenID = await this.abiService.getFirstTokenID(pairAddress);
        this.cacheService.setFirstTokenID(pairAddress, {
            firstTokenID: firstTokenID,
        });
        return firstTokenID;
    }

    private async getSecondTokenID(pairAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getSecondTokenID(
            pairAddress,
        );
        if (!!cachedData) {
            return cachedData.secondTokenID;
        }

        const secondTokenID = await this.abiService.getSecondTokenID(
            pairAddress,
        );
        this.cacheService.setSecondTokenID(pairAddress, {
            secondTokenID: secondTokenID,
        });
        return secondTokenID;
    }

    private async getLpTokenID(pairAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getLpTokenID(pairAddress);
        if (!!cachedData) {
            return cachedData.lpTokenID;
        }

        const lpTokenID = await this.abiService.getLpTokenID(pairAddress);
        this.cacheService.setLpTokenID(pairAddress, {
            lpTokenID: lpTokenID,
        });
        return lpTokenID;
    }

    private async getPriceUSDByPath(tokenID: string): Promise<string> {
        const path = await this.context.getPath(tokenID, 'WEGLD-ccae2d');
        const pair = await this.context.getPairByTokens(path[0], path[1]);
        const usdPrice = await this.getTokenPriceUSD(pair.address, path[1]);
        return usdPrice;
    }
}
