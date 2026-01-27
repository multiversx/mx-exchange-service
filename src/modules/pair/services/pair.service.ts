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
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { PairComputeService } from './pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { PairInfoModel } from '../models/pair-info.model';
import { PairsStateService } from 'src/modules/state/services/pairs.state.service';

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
        private readonly pairsState: PairsStateService,
    ) {}

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.pairAbi.firstTokenID(pairAddress);
        return this.tokenService.tokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.pairAbi.secondTokenID(pairAddress);
        return this.tokenService.tokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);
        return lpTokenID === undefined
            ? undefined
            : this.tokenService.tokenMetadata(lpTokenID);
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

    async getAmountOut(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const [wrappedTokenID, [pair]] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairsState.getPairs(
                [pairAddress],
                ['firstTokenId', 'secondTokenId', 'info', 'totalFeePercent'],
            ),
        ]);

        const {
            firstTokenId: firstTokenID,
            secondTokenId: secondTokenID,
            info: pairInfo,
            totalFeePercent,
        } = pair;

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
        const [wrappedTokenID, [pair]] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairsState.getPairs(
                [pairAddress],
                ['firstTokenId', 'secondTokenId', 'info', 'totalFeePercent'],
            ),
        ]);

        const {
            firstTokenId: firstTokenID,
            secondTokenId: secondTokenID,
            info: pairInfo,
            totalFeePercent,
        } = pair;

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

    computeLiquidityPosition(
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

    async getLiquidityPositionUSD(
        pairAddress: string,
        amount: string,
    ): Promise<string> {
        const [result] = await this.getAllLiquidityPositionsUSD(
            [pairAddress],
            [amount],
        );

        return result;
    }

    async getAllLiquidityPositionsUSD(
        pairAddresses: string[],
        amounts: string[],
    ): Promise<string[]> {
        const pairs = await this.pairsState.getPairsWithTokens(pairAddresses, [
            'address',
            'info',
        ]);

        return pairs.map((pair, index) => {
            const liquidityPosition = this.computeLiquidityPosition(
                pair.info,
                amounts[index],
            );

            return computeValueUSD(
                liquidityPosition.firstTokenAmount,
                pair.firstToken.decimals,
                pair.firstToken.price,
            )
                .plus(
                    computeValueUSD(
                        liquidityPosition.secondTokenAmount,
                        pair.secondToken.decimals,
                        pair.secondToken.price,
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

        let returnedData = null;
        try {
            const token = await this.tokenService.tokenMetadataFromState(
                tokenID,
                ['type', 'pairAddress'],
            );

            if (token && token.type === EsdtTokenType.FungibleLpToken) {
                returnedData = token.pairAddress;
            }
        } catch (error) {}

        await this.cachingService.set(
            `${tokenID}.pairAddress`,
            returnedData,
            Constants.oneHour(),
        );
        return returnedData;
    }

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }

    // TODO : remove after adding refresh to state rpc
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
