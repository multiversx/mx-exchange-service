import { Injectable } from '@nestjs/common';
import { tokenProviderUSD, tokensPriceData } from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../../models/pair-info.model';
import {
    LiquidityPosition,
    TemporaryFundsModel,
} from '../../models/pair.model';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from './pair.utils';
import { CachePairService } from '../../services/cache-manager/cache-pair.service';
import { AbiPairService } from './abi-pair.service';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { TokenModel } from '../../models/esdtToken.model';
import { ContextService } from '../../services/context/context.service';

@Injectable()
export class PairService {
    constructor(
        private abiService: AbiPairService,
        private cacheService: CachePairService,
        private context: ContextService,
        private priceFeed: PriceFeedService,
    ) {}

    async getFirstTokenID(pairAddress: string): Promise<string> {
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

    async getSecondTokenID(pairAddress: string): Promise<string> {
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

    async getLpTokenID(pairAddress: string): Promise<string> {
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

    async getFirstToken(pairAddress: string): Promise<TokenModel> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.context.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<TokenModel> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.context.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<TokenModel> {
        const lpTokenID = await this.getLpTokenID(pairAddress);

        return this.context.getTokenMetadata(lpTokenID);
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        const firstToken = await this.getFirstToken(pairAddress);
        const firstTokenPrice = await this.getEquivalentForLiquidity(
            pairAddress,
            firstToken.token,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );
        return new BigNumber(firstTokenPrice)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        const secondToken = await this.getSecondToken(pairAddress);
        const secondTokenPrice = await this.getEquivalentForLiquidity(
            pairAddress,
            secondToken.token,
            new BigNumber(`1e${secondToken.decimals}`).toFixed(),
        );
        return new BigNumber(secondTokenPrice)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const tokenPriceUSD = await this.getTokenPriceUSD(
            pairAddress,
            firstTokenID,
        );
        return tokenPriceUSD.toFixed();
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const tokenPriceUSD = await this.getTokenPriceUSD(
            pairAddress,
            secondTokenID,
        );
        return tokenPriceUSD.toFixed();
    }

    async getLpTokenSecondTokenEquivalent(
        pairAddress: string,
    ): Promise<string> {
        const secondToken = await this.getSecondToken(pairAddress);
        const lpToken = await this.getLpToken(pairAddress);
        const lpTokenPosition = await this.getLiquidityPosition(
            pairAddress,
            new BigNumber(`1e${lpToken.decimals}`).toFixed(),
        );
        const firstTokenPrice = await this.getFirstTokenPrice(pairAddress);
        const lpTokenPrice = new BigNumber(firstTokenPrice)
            .multipliedBy(new BigNumber(lpTokenPosition.firstTokenAmount))
            .plus(new BigNumber(lpTokenPosition.secondTokenAmount));
        return lpTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
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
            .toFixed();
    }

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);

        switch (tokenID) {
            case firstTokenID:
                return await this.getFirstTokenPrice(pairAddress);
            case secondTokenID:
                return await this.getSecondTokenPrice(pairAddress);
        }
    }

    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        if (tokensPriceData.has(tokenID)) {
            return this.priceFeed.getTokenPrice(tokensPriceData.get(tokenID));
        }

        const firstTokenID = await this.getFirstTokenID(pairAddress);
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        let tokenPrice: string;
        let tokenPriceUSD: BigNumber;
        let usdPrice: BigNumber;

        switch (tokenID) {
            case firstTokenID:
                tokenPrice = await this.getFirstTokenPrice(pairAddress);
                if (tokensPriceData.has(secondTokenID)) {
                    const usdPrice = await this.priceFeed.getTokenPrice(
                        tokensPriceData.get(secondTokenID),
                    );
                    tokenPriceUSD = new BigNumber(tokenPrice).multipliedBy(
                        usdPrice,
                    );
                    return tokenPriceUSD;
                }

                usdPrice = await this.getPriceUSDByPath(secondTokenID);
                tokenPriceUSD = new BigNumber(tokenPrice).multipliedBy(
                    usdPrice,
                );
                return tokenPriceUSD;

            case secondTokenID:
                tokenPrice = await this.getSecondTokenPrice(pairAddress);
                if (tokensPriceData.has(firstTokenID)) {
                    const usdPrice = await this.priceFeed.getTokenPrice(
                        tokensPriceData.get(firstTokenID),
                    );
                    tokenPriceUSD = new BigNumber(tokenPrice).multipliedBy(
                        usdPrice,
                    );
                    return tokenPriceUSD;
                }
                usdPrice = await this.getPriceUSDByPath(firstTokenID);
                tokenPriceUSD = new BigNumber(tokenPrice).multipliedBy(
                    usdPrice,
                );
                return tokenPriceUSD;
        }

        return new BigNumber(0);
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [firstTokenID, secondTokenID, pairInfo] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
        ]);

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
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        const [
            cachedFirstReserve,
            cachedSecondReserve,
            cachedTotalSupply,
        ] = await Promise.all([
            this.cacheService.getReserves(pairAddress, firstTokenID),
            this.cacheService.getReserves(pairAddress, secondTokenID),
            this.cacheService.getTotalSupply(pairAddress),
        ]);

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
            return pairInfo;
        }

        return this.getPairInfoMetadata(pairAddress);
    }

    async getState(pairAddress: string): Promise<string> {
        return this.abiService.getState(pairAddress);
    }

    async getAmountOut(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const [firstTokenID, secondTokenID, pairInfo] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
        ]);

        switch (tokenInID) {
            case firstTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toFixed();
            case secondTokenID:
                return getAmountOut(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
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
        const [firstTokenID, secondTokenID, pairInfo] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
        ]);

        switch (tokenOutID) {
            case firstTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toFixed();
            case secondTokenID:
                return getAmountIn(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
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
        const [firstTokenID, secondTokenID, pairInfo] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
        ]);

        switch (tokenInID) {
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
                this.getFirstToken(pairMetadata.address),
                this.getSecondToken(pairMetadata.address),
                this.abiService.getTemporaryFunds(
                    pairMetadata.address,
                    callerAddress,
                    pairMetadata.firstToken,
                ),
                this.abiService.getTemporaryFunds(
                    pairMetadata.address,
                    callerAddress,
                    pairMetadata.secondToken,
                ),
            ]);

            if (
                temporaryFundsFirstToken.isZero() &&
                temporaryFundsSecondToken.isZero()
            ) {
                continue;
            }

            const temporaryFundsPair = new TemporaryFundsModel();
            temporaryFundsPair.pairAddress = pairMetadata.address;

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
            firstTokenAmount: firstTokenAmount.toFixed(),
            secondTokenAmount: secondTokenAmount.toFixed(),
        };
    }

    async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        if (!tokensPriceData.has(tokenProviderUSD)) {
            return new BigNumber(0);
        }

        const path = await this.context.getPath(tokenID, tokenProviderUSD);
        if (path.length === 0) {
            return new BigNumber(0);
        }
        const pair = await this.context.getPairByTokens(path[0], path[1]);
        const firstTokenPrice = await this.getTokenPrice(pair.address, path[0]);
        const secondTokenPriceUSD = await this.getTokenPriceUSD(
            pair.address,
            path[1],
        );
        return new BigNumber(firstTokenPrice).multipliedBy(secondTokenPriceUSD);
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string | null> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const lpTokenID = await this.getLpTokenID(pairAddress);
            return { lpTokenID: lpTokenID, pairAddress: pairAddress };
        });
        const pairs = await Promise.all(promises);
        const pair = pairs.find(pair => pair.lpTokenID === tokenID);
        return pair?.pairAddress;
    }
}
