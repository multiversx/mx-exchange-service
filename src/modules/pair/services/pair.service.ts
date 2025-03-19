import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { mxConfig } from 'src/config';
import { BigNumber } from 'bignumber.js';
import { LiquidityPosition, LockedTokensInfo } from '../models/pair.model';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from '../pair.utils';
import { computeValueUSD } from 'src/utils/token.converters';
import { CacheService } from 'src/services/caching/cache.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PairAbiService } from './pair.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { PairComputeService } from './pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { PairInfoModel } from '../models/pair-info.model';

@Injectable()
export class PairService {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly routerAbi: RouterAbiService,
        private readonly wrapAbi: WrapAbiService,
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
        private readonly cachingService: CacheService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.pairAbi.firstTokenID(pairAddress);
        return this.tokenService.tokenMetadata(firstTokenID);
    }

    async getAllFirstTokens(pairAddresses: string[]): Promise<EsdtToken[]> {
        const tokenIDs = await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.firstTokenID',
            this.pairAbi.firstTokenID.bind(this.pairAbi),
            CacheTtlInfo.TokenID,
        );

        return this.tokenService.getAllTokensMetadata(tokenIDs);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.pairAbi.secondTokenID(pairAddress);
        return this.tokenService.tokenMetadata(secondTokenID);
    }

    async getAllSecondTokens(pairAddresses: string[]): Promise<EsdtToken[]> {
        const tokenIDs = await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.secondTokenID',
            this.pairAbi.secondTokenID.bind(this.pairAbi),
            CacheTtlInfo.TokenID,
        );

        return this.tokenService.getAllTokensMetadata(tokenIDs);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);
        return lpTokenID === undefined
            ? undefined
            : this.tokenService.tokenMetadata(lpTokenID);
    }

    async getAllLpTokensIds(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.lpTokenID',
            this.pairAbi.lpTokenID.bind(this.pairAbi),
            CacheTtlInfo.TokenID,
        );
    }

    async getAllLpTokens(pairAddresses: string[]): Promise<EsdtToken[]> {
        const tokenIDs = await this.getAllLpTokensIds(pairAddresses);

        return this.tokenService.getAllTokensMetadata(tokenIDs);
    }

    async getAllStates(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.state',
            this.pairAbi.state.bind(this.pairAbi),
            CacheTtlInfo.ContractState,
        );
    }

    async getAllFeeStates(pairAddresses: string[]): Promise<boolean[]> {
        return getAllKeys<boolean>(
            this.cachingService,
            pairAddresses,
            'pair.feeState',
            this.pairAbi.feeState.bind(this.pairAbi),
            CacheTtlInfo.ContractState,
        );
    }

    async getAllLockedValueUSD(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.lockedValueUSD',
            this.pairCompute.lockedValueUSD.bind(this.pairCompute),
            CacheTtlInfo.ContractInfo,
        );
    }

    async getAllDeployedAt(pairAddresses: string[]): Promise<number[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.deployedAt',
            this.pairCompute.deployedAt.bind(this.pairCompute),
            CacheTtlInfo.ContractState,
        );
    }

    async getAllTradesCount(pairAddresses: string[]): Promise<number[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.tradesCount',
            this.pairCompute.tradesCount.bind(this.pairCompute),
            CacheTtlInfo.ContractState,
        );
    }

    async getAllHasFarms(pairAddresses: string[]): Promise<boolean[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.hasFarms',
            this.pairCompute.hasFarms.bind(this.pairCompute),
            CacheTtlInfo.ContractState,
        );
    }

    async getAllHasDualFarms(pairAddresses: string[]): Promise<boolean[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.hasDualFarms',
            this.pairCompute.hasDualFarms.bind(this.pairCompute),
            CacheTtlInfo.ContractState,
        );
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
            totalFeePercent,
        ] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
            this.pairAbi.pairInfoMetadata(pairAddress),
            this.pairAbi.totalFeePercent(pairAddress),
        ]);

        const tokenIn =
            tokenInID === mxConfig.EGLDIdentifier ? wrappedTokenID : tokenInID;

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
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
            this.pairAbi.pairInfoMetadata(pairAddress),
            this.pairAbi.totalFeePercent(pairAddress),
        ]);

        const tokenOut =
            tokenOutID === mxConfig.EGLDIdentifier
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
        const [wrappedTokenID, firstTokenID, secondTokenID, pairInfo] =
            await Promise.all([
                this.wrapAbi.wrappedEgldTokenID(),
                this.pairAbi.firstTokenID(pairAddress),
                this.pairAbi.secondTokenID(pairAddress),
                this.pairAbi.pairInfoMetadata(pairAddress),
            ]);

        const tokenIn =
            tokenInID === mxConfig.EGLDIdentifier ? wrappedTokenID : tokenInID;

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
        const pairInfo = await this.pairAbi.pairInfoMetadata(pairAddress);

        return this.computeLiquidityPosition(pairInfo, amount);
    }

    private computeLiquidityPosition(
        pairInfo: PairInfoModel,
        amount: string,
    ): LiquidityPosition {
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

    async getAllLiquidityPositions(
        pairAddresses: string[],
        amounts: string[],
    ): Promise<LiquidityPosition[]> {
        const allPairsInfo = await this.pairAbi.getAllPairsInfoMetadata(
            pairAddresses,
        );

        return allPairsInfo.map((pairInfo, index) =>
            this.computeLiquidityPosition(pairInfo, amounts[index]),
        );
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
            this.getFirstToken(pairAddress),
            this.getSecondToken(pairAddress),
            this.pairCompute.firstTokenPriceUSD(pairAddress),
            this.pairCompute.secondTokenPriceUSD(pairAddress),
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

    async getAllLiquidityPositionsUSD(
        pairAddresses: string[],
        amounts: string[],
    ): Promise<string[]> {
        const allFirstTokens = await this.getAllFirstTokens(pairAddresses);
        const allSecondTokens = await this.getAllSecondTokens(pairAddresses);
        const allFirstTokensPriceUSD =
            await this.pairCompute.getAllFirstTokensPriceUSD(pairAddresses);
        const allSecondTokensPriceUSD =
            await this.pairCompute.getAllSecondTokensPricesUSD(pairAddresses);
        const allLiquidityPositions = await this.getAllLiquidityPositions(
            pairAddresses,
            amounts,
        );

        return pairAddresses.map((_, index) => {
            return computeValueUSD(
                allLiquidityPositions[index].firstTokenAmount,
                allFirstTokens[index].decimals,
                allFirstTokensPriceUSD[index],
            )
                .plus(
                    computeValueUSD(
                        allLiquidityPositions[index].secondTokenAmount,
                        allSecondTokens[index].decimals,
                        allSecondTokensPriceUSD[index],
                    ),
                )
                .toFixed();
        });
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string | null> {
        const cachedValue: string = await this.cachingService.get(
            `${tokenID}.pairAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        const pairsAddress = await this.routerAbi.pairsAddress();
        const lpTokenIDs = await this.getAllLpTokensIds(pairsAddress);

        let returnedData = null;
        for (let index = 0; index < lpTokenIDs.length; index++) {
            if (lpTokenIDs[index] === tokenID) {
                returnedData = pairsAddress[index];
                break;
            }
        }

        await this.cachingService.set(
            `${tokenID}.pairAddress`,
            returnedData,
            Constants.oneHour(),
        );
        return returnedData;
    }

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        const pairsAddress = await this.routerAbi.pairsAddress();
        for (const pairAddress of pairsAddress) {
            const [firstTokenID, secondTokenID, lpTokenID] = await Promise.all([
                this.pairAbi.firstTokenID(pairAddress),
                this.pairAbi.secondTokenID(pairAddress),
                this.pairAbi.lpTokenID(pairAddress),
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

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }

    async getLockedTokensInfo(pairAddress: string): Promise<LockedTokensInfo> {
        const [
            lockingScAddress,
            unlockEpoch,
            lockingDeadlineEpoch,
            currentEpoch,
        ] = await Promise.all([
            this.pairAbi.lockingScAddress(pairAddress),
            this.pairAbi.unlockEpoch(pairAddress),
            this.pairAbi.lockingDeadlineEpoch(pairAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        if (
            lockingScAddress === undefined ||
            unlockEpoch === undefined ||
            lockingDeadlineEpoch === undefined
        ) {
            return undefined;
        }

        if (currentEpoch >= lockingDeadlineEpoch) {
            return undefined;
        }

        return new LockedTokensInfo({
            lockingScAddress: lockingScAddress,
            lockingSC: new SimpleLockModel({ address: lockingScAddress }),
            unlockEpoch,
            lockingDeadlineEpoch,
        });
    }
}
