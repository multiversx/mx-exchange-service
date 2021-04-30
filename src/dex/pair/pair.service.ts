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
import { elrondConfig, abiConfig } from '../../config';
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
        const reserves0 = new BigNumber(pairInfo[0]).dividedBy(
            new BigNumber(`10e${token0.decimals}`),
        );
        const reserves1 = new BigNumber(pairInfo[1]).dividedBy(
            new BigNumber(`10e${token1.decimals}`),
        );
        const totalSupply = new BigNumber(pairInfo[2]).dividedBy(
            new BigNumber(`10e${lpToken.decimals}`),
        );

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
        const tokenAmount = `${amount}e${tokenIn.decimals.toString()}`;

        const getAmountOut = contract.methods.getAmountOut([
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(new BigNumber(tokenAmount)),
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountOut.buildQuery(),
        );

        const result = getAmountOut.interpretQueryResponse(queryResponse);
        const amountOut = new BigNumber(result.firstValue.valueOf()).dividedBy(
            `10e${tokenOut.decimals}`,
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
        const tokenAmount = `${amount}e${tokenOut.decimals.toString()}`;

        const getAmountInInteraction: Interaction = contract.methods.getAmountIn(
            [
                BytesValue.fromUTF8(tokenOutID),
                new BigUIntValue(new BigNumber(tokenAmount)),
            ],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountInInteraction.buildQuery(),
        );

        const result = getAmountInInteraction.interpretQueryResponse(
            queryResponse,
        );
        const amountIn = new BigNumber(result.firstValue.valueOf()).dividedBy(
            `10e${tokenIn.decimals}`,
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
        const tokenAmount = `${amount}e${tokenIn.decimals.toString()}`;

        const getEquivalentInteraction: Interaction = contract.methods.getEquivalent(
            [
                BytesValue.fromUTF8(tokenInID),
                new BigUIntValue(new BigNumber(tokenAmount)),
            ],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getEquivalentInteraction.buildQuery(),
        );

        const result = getEquivalentInteraction.interpretQueryResponse(
            queryResponse,
        );
        const equivalentAmount = new BigNumber(
            result.firstValue.valueOf(),
        ).dividedBy(`10e${tokenOut.decimals}`);
        return equivalentAmount.toString();
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);

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
        return result.firstValue.valueOf();
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
        const tokenAmount = `${amount}e${lpToken.decimals.toString()}`;

        const getLiquidityPositionInteraction: Interaction = contract.methods.getTokensForGivenPosition(
            [new BigUIntValue(new BigNumber(tokenAmount))],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getLiquidityPositionInteraction.buildQuery(),
        );

        const result = getLiquidityPositionInteraction.interpretQueryResponse(
            queryResponse,
        );

        const firstTokenAmount = new BigNumber(
            result.values[0].valueOf().amount,
        ).dividedBy(`10e${token0.decimals}`);
        const secondTokenAmount = new BigNumber(
            result.values[1].valueOf().amount,
        ).dividedBy(`10e${token1.decimals}`);

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
        const amount0Denom = new BigNumber(
            `${amount0}e${token0.decimals.toString()}`,
        );
        const amount1Denom = new BigNumber(
            `${amount1}e${token1.decimals.toString()}`,
        );

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
        transaction.setGasLimit(new GasLimit(1000000));

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
        transaction.setGasLimit(new GasLimit(1000000));
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
        const liquidityDenom = new BigNumber(
            `${liqidity}e${token.decimals.toString()}`,
        );
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

        return this.context.esdtTransfer(contract, args, new GasLimit(1000000));
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

        const amountInDenom = new BigNumber(
            `${amountIn}e${tokenIn.decimals.toString()}`,
        );
        const amountOutDenom = new BigNumber(
            `${amountOut}e${tokenOut.decimals.toString()}`,
        );
        const args = [
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(amountInDenom),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(tokenOutID),
            new BigUIntValue(amountOutDenom.multipliedBy(1 - tolerance)),
        ];

        return this.context.esdtTransfer(contract, args, new GasLimit(1000000));
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

        const amountInDenom = new BigNumber(
            `${amountIn}e${tokenIn.decimals.toString()}`,
        );
        const amountOutDenom = new BigNumber(
            `${amountOut}e${tokenOut.decimals.toString()}`,
        );
        const args = [
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(amountInDenom.multipliedBy(1 + tolerance)),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(tokenOutID),
            new BigUIntValue(amountOutDenom),
        ];

        return this.context.esdtTransfer(contract, args, new GasLimit(1000000));
    }

    async esdtTransfer(
        pairAddress: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const token = await this.context.getTokenMetadata(tokenID);
        const amountDenom = new BigNumber(
            `${amount}e${token.decimals.toString()}`,
        );

        const args = [
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(amountDenom),
            BytesValue.fromUTF8('acceptEsdtPayment'),
        ];

        return this.context.esdtTransfer(contract, args, new GasLimit(1000000));
    }
}
