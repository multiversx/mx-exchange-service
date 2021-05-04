import { Injectable } from '@nestjs/common';
import {
    AbiRegistry,
    BigUIntValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
} from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig, gasConfig } from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { LiquidityPosition, TokenModel } from '../models/pair.model';
import { PairPriceModel } from '../models/pair-price.model';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';

@Injectable()
export class PairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    private async getContract(address: string): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        const abi = new SmartContractAbi(abiRegistry, ['Pair']);
        const contract = new SmartContract({
            address: new Address(address),
            abi: abi,
        });

        return contract;
    }

    async getPairToken(
        pairAddress: string,
        tokenPosition: string,
    ): Promise<TokenModel> {
        const pairs = await this.context.getPairsMetadata();
        const pair = pairs.find(pair => pair.address === pairAddress);
        let tokenID: string;
        if (tokenPosition === 'firstToken') {
            tokenID = pair?.firstToken;
        } else if (tokenPosition === 'secondToken') {
            tokenID = pair?.secondToken;
        }

        return this.context.getTokenMetadata(tokenID);
    }

    async getLpToken(pairAddress: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getLpToken(
            pairAddress,
        );
        if (!!cachedData) {
            return cachedData.lpToken;
        }

        const contract = await this.getContract(pairAddress);
        const getLpTokenInteraction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            getLpTokenInteraction.buildQuery(),
        );
        const result = getLpTokenInteraction.interpretQueryResponse(
            queryResponse,
        );
        const token = await this.context.getTokenMetadata(
            result.firstValue.valueOf(),
        );

        this.cacheManagerService.setLpToken(pairAddress, { lpToken: token });
        return token;
    }

    async getPairInfo(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.getContract(pairAddress);
        const pairMetadata = await this.context.getPairMetadata(pairAddress);
        const token0 = await this.context.getTokenMetadata(
            pairMetadata.firstToken,
        );
        const token1 = await this.context.getTokenMetadata(
            pairMetadata.secondToken,
        );
        const lpToken = await this.getLpToken(pairAddress);

        const getAllPairsInteraction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAllPairsInteraction.buildQuery(),
        );
        const result = getAllPairsInteraction.interpretQueryResponse(
            queryResponse,
        );

        const pairInfo = result.values.map(v => v.valueOf());
        const reserves0 = this.context.fromBigNumber(pairInfo[0], token0);
        const reserves1 = this.context.fromBigNumber(pairInfo[1], token1);
        const totalSupply = this.context.fromBigNumber(pairInfo[2], lpToken);

        return {
            reserves0: reserves0.toString(),
            reserves1: reserves1.toString(),
            totalSupply: totalSupply.toString(),
        };
    }

    async getPairPrice(address: string): Promise<PairPriceModel> {
        const pairsMetadata = await this.context.getPairsMetadata();
        const pair = pairsMetadata.find(pair => pair.address === address);
        const pairPrice = new PairPriceModel();

        pairPrice.firstToken = (
            await this.getAmountOut(pair.address, pair.firstToken, '1')
        ).toString();
        pairPrice.secondToken = (
            await this.getAmountOut(pair.address, pair.secondToken, '1')
        ).toString();

        return pairPrice;
    }

    async getPairState(pairAddress: string): Promise<boolean> {
        const contract = await this.getContract(pairAddress);

        const getStateInteraction: Interaction = contract.methods.getState([]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getStateInteraction.buildQuery(),
        );

        const result = getStateInteraction.interpretQueryResponse(
            queryResponse,
        );
        return result.firstValue.valueOf();
    }

    async getAmountOut(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const pairMetadata = await this.context.getPairMetadata(pairAddress);
        const tokenOutID =
            pairMetadata.firstToken === tokenInID
                ? pairMetadata.secondToken
                : pairMetadata.firstToken;
        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const tokenOut = await this.context.getTokenMetadata(tokenOutID);

        const getAmountOut = contract.methods.getAmountOut([
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(this.context.toBigNumber(amount, tokenIn)),
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountOut.buildQuery(),
        );

        const result = getAmountOut.interpretQueryResponse(queryResponse);
        const amountOut = this.context.fromBigNumber(
            result.firstValue.valueOf(),
            tokenOut,
        );
        return amountOut.toString();
    }

    async getAmountIn(
        pairAddress: string,
        tokenOutID: string,
        amount: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const pairMetadata = await this.context.getPairMetadata(pairAddress);
        const tokenInID =
            pairMetadata.firstToken === tokenOutID
                ? pairMetadata.secondToken
                : pairMetadata.firstToken;
        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const tokenOut = await this.context.getTokenMetadata(tokenOutID);

        const getAmountInInteraction: Interaction = contract.methods.getAmountIn(
            [
                BytesValue.fromUTF8(tokenOutID),
                new BigUIntValue(this.context.toBigNumber(amount, tokenOut)),
            ],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountInInteraction.buildQuery(),
        );

        const result = getAmountInInteraction.interpretQueryResponse(
            queryResponse,
        );
        const amountIn = this.context.fromBigNumber(
            result.firstValue.valueOf(),
            tokenIn,
        );
        return amountIn.toString();
    }

    async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const pairMetadata = await this.context.getPairMetadata(pairAddress);
        const tokenOutID =
            pairMetadata.firstToken === tokenInID
                ? pairMetadata.secondToken
                : pairMetadata.firstToken;
        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const tokenOut = await this.context.getTokenMetadata(tokenOutID);

        const getEquivalentInteraction: Interaction = contract.methods.getEquivalent(
            [
                BytesValue.fromUTF8(tokenInID),
                new BigUIntValue(this.context.toBigNumber(amount, tokenIn)),
            ],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getEquivalentInteraction.buildQuery(),
        );

        const result = getEquivalentInteraction.interpretQueryResponse(
            queryResponse,
        );

        return this.context
            .fromBigNumber(result.firstValue.valueOf(), tokenOut)
            .toString();
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const token = await this.context.getTokenMetadata(tokenID);

        const getTemporaryFundsInteraction: Interaction = contract.methods.getTemporaryFunds(
            [
                BytesValue.fromHex(new Address(callerAddress).hex()),
                BytesValue.fromUTF8(tokenID),
            ],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getTemporaryFundsInteraction.buildQuery(),
        );

        const result = getTemporaryFundsInteraction.interpretQueryResponse(
            queryResponse,
        );
        return this.context
            .fromBigNumber(result.firstValue.valueOf(), token)
            .toString();
    }

    async getLiquidityPosition(
        pairAddress: string,
        amount: string,
    ): Promise<LiquidityPosition> {
        const contract = await this.getContract(pairAddress);
        const pairMetadata = await this.context.getPairMetadata(pairAddress);
        const token0 = await this.context.getTokenMetadata(
            pairMetadata.firstToken,
        );
        const token1 = await this.context.getTokenMetadata(
            pairMetadata.secondToken,
        );
        const lpToken = await this.getLpToken(pairAddress);

        const getLiquidityPositionInteraction: Interaction = contract.methods.getTokensForGivenPosition(
            [new BigUIntValue(this.context.toBigNumber(amount, lpToken))],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getLiquidityPositionInteraction.buildQuery(),
        );

        const result = getLiquidityPositionInteraction.interpretQueryResponse(
            queryResponse,
        );

        const firstTokenAmount = this.context.fromBigNumber(
            result.values[0].valueOf().amount,
            token0,
        );
        const secondTokenAmount = this.context.fromBigNumber(
            result.values[1].valueOf().amount,
            token1,
        );

        return {
            firstTokenAmount: firstTokenAmount.toString(),
            secondTokenAmount: secondTokenAmount.toString(),
        };
    }

    async addLiquidity(
        pairAddress: string,
        amount0: string,
        amount1: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const pairsMetadata = await this.context.getPairsMetadata();
        const pair = pairsMetadata.find(pair => pair.address === pairAddress);
        const token0 = await this.context.getTokenMetadata(pair.firstToken);
        const token1 = await this.context.getTokenMetadata(pair.secondToken);
        const amount0Denom = this.context.toBigNumber(amount0, token0);
        const amount1Denom = this.context.toBigNumber(amount1, token1);

        const amount0Min = amount0Denom.multipliedBy(1 - tolerance);
        const amount1Min = amount1Denom.multipliedBy(1 - tolerance);

        const addLiquidityInteraction: Interaction = contract.methods.addLiquidity(
            [
                new BigUIntValue(amount0Denom),
                new BigUIntValue(amount1Denom),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
            ],
        );

        const transaction = addLiquidityInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidity));

        return transaction.toPlainObject();
    }

    async reclaimTemporaryFunds(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const interaction: Interaction = contract.methods.reclaimTemporaryFunds(
            [],
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        return transaction.toPlainObject();
    }

    async removeLiquidity(
        pairAddress: string,
        liqidity: string,
        tokenID: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);

        const token = await this.context.getTokenMetadata(tokenID);
        const liquidityDenom = this.context.toBigNumber(liqidity, token);
        const liquidityPosition = await this.getLiquidityPosition(
            pairAddress,
            liqidity,
        );
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        ).multipliedBy(1 - tolerance);
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        ).multipliedBy(1 - tolerance);

        const args = [
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(liquidityDenom),
            BytesValue.fromUTF8('removeLiquidity'),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.removeLiquidity),
        );
    }

    async swapTokensFixedInput(
        pairAddress: string,
        tokenInID: string,
        amountIn: string,
        tokenOutID: string,
        amountOut: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const tokenOut = await this.context.getTokenMetadata(tokenOutID);

        const amountInDenom = this.context.toBigNumber(amountIn, tokenIn);
        const amountOutDenom = this.context.toBigNumber(amountOut, tokenOut);
        const args = [
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(amountInDenom),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(tokenOutID),
            new BigUIntValue(amountOutDenom.multipliedBy(1 - tolerance)),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async swapTokensFixedOutput(
        pairAddress: string,
        tokenInID: string,
        amountIn: string,
        tokenOutID: string,
        amountOut: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const tokenOut = await this.context.getTokenMetadata(tokenOutID);

        const amountInDenom = this.context.toBigNumber(amountIn, tokenIn);
        const amountOutDenom = this.context.toBigNumber(amountOut, tokenOut);
        const args = [
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(amountInDenom.multipliedBy(1 + tolerance)),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(tokenOutID),
            new BigUIntValue(amountOutDenom),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async esdtTransfer(
        pairAddress: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const token = await this.context.getTokenMetadata(tokenID);

        const args = [
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(this.context.toBigNumber(amount, token)),
            BytesValue.fromUTF8('acceptEsdtPayment'),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }
}
