import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig } from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { LiquidityPosition, TokenModel } from '../models/pair.model';
import { ContextService } from '../utils/context.service';
import { RedlockService } from 'src/services';
import {
    quote,
    getAmountOut,
    getAmountIn,
    getTokenForGivenPosition,
} from './pair.utils';
import { CachePairService } from 'src/services/cache-manager/cache-pair.service';
import { AbiPairService } from './abi-pair.service';

@Injectable()
export class PairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private abiService: AbiPairService,
        private cacheService: CachePairService,
        private context: ContextService,
        private redlockService: RedlockService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
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

        return await this.context.getTokenMetadata(lpTokenID);
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

            this.getPairInfoMetadata(pairAddress);
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
        return this.pairInfoDenom(pairAddress, pairInfo);
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
        const firstToken = await this.getFirstToken(pairAddress);
        const secondToken = await this.getSecondToken(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        let amountDenom;
        let amountOut: BigNumber;
        switch (tokenInID) {
            case firstToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, firstToken)
                    .toString();
                amountOut = getAmountOut(
                    amountDenom,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                );
                return this.context
                    .fromBigNumber(amountOut.toString(), secondToken)
                    .toString();
            case secondToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, secondToken)
                    .toString();
                amountOut = getAmountOut(
                    amountDenom,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                );
                return this.context
                    .fromBigNumber(amountOut.toString(), firstToken)
                    .toString();
            default:
                return;
        }
    }

    async getAmountIn(
        pairAddress: string,
        tokenOutID: string,
        amount: string,
    ): Promise<string> {
        const firstToken = await this.getFirstToken(pairAddress);
        const secondToken = await this.getSecondToken(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        let amountDenom;
        let amountIn: BigNumber;
        switch (tokenOutID) {
            case firstToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, firstToken)
                    .toString();
                amountIn = getAmountIn(
                    amountDenom,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                );
                return this.context
                    .fromBigNumber(amountIn.toString(), secondToken)
                    .toString();
            case secondToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, secondToken)
                    .toString();
                amountIn = getAmountIn(
                    amountDenom,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                );
                return this.context
                    .fromBigNumber(amountIn.toString(), firstToken)
                    .toString();
            default:
                return;
        }
    }

    async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const firstToken = await this.getFirstToken(pairAddress);
        const secondToken = await this.getSecondToken(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        let amountDenom;
        let equivalentOutAmount: BigNumber;
        switch (tokenInID) {
            case firstToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, firstToken)
                    .toString();
                equivalentOutAmount = quote(
                    amountDenom,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                );
                return this.context
                    .fromBigNumber(equivalentOutAmount.toString(), secondToken)
                    .toString();
            case secondToken.token:
                amountDenom = this.context
                    .toBigNumber(amount, secondToken)
                    .toString();
                equivalentOutAmount = quote(
                    amountDenom,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                );
                return this.context
                    .fromBigNumber(equivalentOutAmount.toString(), firstToken)
                    .toString();
            default:
                return;
        }
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        const token = await this.context.getTokenMetadata(tokenID);

        const cachedData = await this.cacheService.getTemporaryFunds(
            pairAddress,
            callerAddress,
            tokenID,
        );
        if (!!cachedData) {
            return this.context
                .fromBigNumber(cachedData.temporaryFunds, token)
                .toString();
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

        return this.context.fromBigNumber(temporaryFunds, token).toString();
    }

    async getLiquidityPosition(
        pairAddress: string,
        amount: string,
    ): Promise<LiquidityPosition> {
        const firstToken = await this.getFirstToken(pairAddress);
        const secondToken = await this.getSecondToken(pairAddress);
        const lpToken = await this.getLpToken(pairAddress);
        const pairInfo = await this.getPairInfoMetadata(pairAddress);

        const amountDenom = this.context
            .toBigNumber(amount, lpToken)
            .toString();
        const firstTokenAmount = getTokenForGivenPosition(
            amountDenom,
            pairInfo.reserves0,
            pairInfo.totalSupply,
        );
        const secondTokenAmount = getTokenForGivenPosition(
            amountDenom,
            pairInfo.reserves1,
            pairInfo.totalSupply,
        );

        return {
            firstTokenAmount: this.context
                .fromBigNumber(firstTokenAmount.toString(), firstToken)
                .toString(),
            secondTokenAmount: this.context
                .fromBigNumber(secondTokenAmount.toString(), secondToken)
                .toString(),
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

    private async pairInfoDenom(
        pairAddress: string,
        pairInfo: PairInfoModel,
    ): Promise<PairInfoModel> {
        const firstToken = await this.getFirstToken(pairAddress);
        const secondToken = await this.getSecondToken(pairAddress);
        const lpToken = await this.getLpToken(pairAddress);

        const reserves0 = this.context.fromBigNumber(
            pairInfo.reserves0,
            firstToken,
        );
        const reserves1 = this.context.fromBigNumber(
            pairInfo.reserves1,
            secondToken,
        );
        const totalSupply = this.context.fromBigNumber(
            pairInfo.totalSupply,
            lpToken,
        );

        return {
            reserves0: reserves0.toString(),
            reserves1: reserves1.toString(),
            totalSupply: totalSupply.toString(),
        };
    }
}
