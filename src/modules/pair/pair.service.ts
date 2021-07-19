import { Inject, Injectable } from '@nestjs/common';
import {
    cacheConfig,
    elrondConfig,
    tokenProviderUSD,
    tokensPriceData,
} from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from './models/pair-info.model';
import { LiquidityPosition, TemporaryFundsModel } from './models/pair.model';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from './pair.utils';
import { AbiPairService } from './abi-pair.service';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { ContextService } from '../../services/context/context.service';
import { WrapService } from '../wrapping/wrap.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { RedisCacheService } from 'src/services/redis-cache.service';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PairService {
    private redisClient: Redis.Redis;
    constructor(
        private abiService: AbiPairService,
        private redisCacheService: RedisCacheService,
        private context: ContextService,
        private priceFeed: PriceFeedService,
        private wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    private async getTokenID(
        pairAddress: string,
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        try {
            const cacheKey = this.getPairCacheKey(pairAddress, tokenCacheKey);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                createValueFunc,
                cacheConfig.token,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get ${tokenCacheKey}`,
                error,
                {
                    path: 'PairService.getTokenID',
                    pairAddress,
                },
            );
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getTokenID(pairAddress, 'firstTokenID', () =>
            this.abiService.getFirstTokenID(pairAddress),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getTokenID(pairAddress, 'secondTokenID', () =>
            this.abiService.getSecondTokenID(pairAddress),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getTokenID(pairAddress, 'lpTokenID', () =>
            this.abiService.getLpTokenID(pairAddress),
        );
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.context.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.context.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(pairAddress);
        return this.context.getTokenMetadata(lpTokenID);
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        const firstToken = await this.getFirstToken(pairAddress);
        const firstTokenPrice = await this.getEquivalentForLiquidity(
            pairAddress,
            firstToken.identifier,
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
            secondToken.identifier,
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
        try {
            const cacheKey = this.getPairCacheKey(pairAddress, 'valueLocked');
            const getValueLocked = () =>
                this.abiService.getPairInfoMetadata(pairAddress);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getValueLocked,
                cacheConfig.reserves,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get reserves and total supply`,
                error,
                {
                    path: 'PairService.getPairInfoMetadata',
                    pairAddress,
                },
            );
        }
    }

    async getState(pairAddress: string): Promise<string> {
        return this.abiService.getState(pairAddress);
    }

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
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
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
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
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
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
            this.abiService.getPairInfoMetadata(pairAddress),
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
                this.getFirstToken(pairMetadata.address),
                this.getSecondToken(pairMetadata.address),
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

        return new LiquidityPosition({
            firstTokenAmount: firstTokenAmount.toFixed(),
            secondTokenAmount: secondTokenAmount.toFixed(),
        });
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

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        const pairsAddress = await this.context.getAllPairsAddress();
        for (const pairAddress of pairsAddress) {
            const [firstTokenID, secondTokenID, lpTokenID] = await Promise.all([
                this.getFirstTokenID(pairAddress),
                this.getSecondTokenID(pairAddress),
                this.getLpTokenID(pairAddress),
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

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
