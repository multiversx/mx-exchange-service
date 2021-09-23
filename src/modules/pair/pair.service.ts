import { Inject, Injectable } from '@nestjs/common';
import {
    cacheConfig,
    constantsConfig,
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
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CachingService } from '../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { oneHour, oneMinute, oneSecond } from '../../helpers/helpers';

@Injectable()
export class PairService {
    constructor(
        private abiService: AbiPairService,
        private cachingService: CachingService,
        private context: ContextService,
        private priceFeed: PriceFeedService,
        private wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getTokenData(
        pairAddress: string,
        tokenCacheKey: string,
        createValueFunc: () => any,
        ttl = cacheConfig.token,
    ): Promise<any> {
        const cacheKey = this.getPairCacheKey(pairAddress, tokenCacheKey);
        try {
            return this.cachingService.getOrSet(cacheKey, createValueFunc, ttl);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairService.name,
                this.getTokenData.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getTokenData(
            pairAddress,
            'firstTokenID',
            () => this.abiService.getFirstTokenID(pairAddress),
            oneHour(),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getTokenData(
            pairAddress,
            'secondTokenID',
            () => this.abiService.getSecondTokenID(pairAddress),
            oneHour(),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getTokenData(
            pairAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(pairAddress),
            oneHour(),
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
        return this.getTokenData(
            pairAddress,
            'firstTokenPrice',
            () => this.computeFirstTokenPrice(pairAddress),
            oneMinute(),
        );
    }

    async computeFirstTokenPrice(pairAddress: string): Promise<string> {
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
        return this.getTokenData(
            pairAddress,
            'secondTokenPrice',
            () => this.computeSecondTokenPrice(pairAddress),
            oneMinute(),
        );
    }

    async computeSecondTokenPrice(pairAddress: string): Promise<string> {
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

        const tokenPriceUSD = await this.getTokenData(
            pairAddress,
            'firstTokenPriceUSD',
            () => this.computeTokenPriceUSD(firstTokenID),
            oneMinute(),
        );
        return tokenPriceUSD;
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        const tokenPriceUSD = await this.getTokenData(
            pairAddress,
            'secondTokenPriceUSD',
            () => this.computeTokenPriceUSD(secondTokenID),
            oneMinute(),
        );
        return tokenPriceUSD;
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getTokenData(
            pairAddress,
            'lpTokenPriceUSD',
            () => this.computeLpTokenPriceUSD(pairAddress),
            oneMinute(),
        );
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [secondToken, lpToken, firstTokenPrice] = await Promise.all([
            this.getSecondToken(pairAddress),
            this.getLpToken(pairAddress),
            this.getFirstTokenPrice(pairAddress),
        ]);
        const [secondTokenPriceUSD, lpTokenPosition] = await Promise.all([
            this.computeTokenPriceUSD(secondToken.identifier),
            this.getLiquidityPosition(
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

    async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        if (tokensPriceData.has(tokenID)) {
            return this.priceFeed.getTokenPrice(tokensPriceData.get(tokenID));
        }

        const usdPrice = await this.getPriceUSDByPath(tokenID);

        return usdPrice;
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'valueLocked');
        try {
            const getValueLocked = () =>
                this.abiService.getPairInfoMetadata(pairAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getValueLocked,
                oneMinute(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairService.name,
                this.getPairInfoMetadata.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTotalFeePercent(pairAddress: string): Promise<number> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'totalFeePercent');
        const getTotalFeePercent = () =>
            this.abiService.getTotalFeePercent(pairAddress);
        try {
            const totalFeePercent = await this.cachingService.getOrSet(
                cacheKey,
                getTotalFeePercent,
                oneMinute(),
            );
            return new BigNumber(totalFeePercent)
                .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                .toNumber();
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairService.name,
                this.getTotalFeePercent.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getState(pairAddress: string): Promise<string> {
        const cacheKey = this.getPairCacheKey(pairAddress, 'state');
        try {
            const getState = () => this.abiService.getState(pairAddress);
            return this.cachingService.getOrSet(cacheKey, getState, oneHour());
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairService.name,
                this.getState.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
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
            this.getPairInfoMetadata(pairAddress),
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
            this.getPairInfoMetadata(pairAddress),
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
            this.getPairInfoMetadata(pairAddress),
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
        const firstTokenPrice = await this.getTokenPrice(pair.address, tokenID);
        const secondTokenPriceUSD = await this.computeTokenPriceUSD(path[1]);
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
