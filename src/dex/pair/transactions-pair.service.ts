import { Injectable } from '@nestjs/common';
import { BigUIntValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, GasLimit } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from '../../config';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';
import { AbiPairService } from './abi-pair.service';
import {
    AddLiquidityArgs,
    ESDTTransferArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from './dto/pair.args';
import { PairService } from './pair.service';

@Injectable()
export class TransactionPairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private abiService: AbiPairService,
        private pairService: PairService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    async addLiquidity(args: AddLiquidityArgs): Promise<TransactionModel> {
        const firstToken = await this.pairService.getFirstToken(
            args.pairAddress,
        );
        const secondToken = await this.pairService.getSecondToken(
            args.pairAddress,
        );
        const amount0Denom = this.context.toBigNumber(args.amount0, firstToken);
        const amount1Denom = this.context.toBigNumber(
            args.amount1,
            secondToken,
        );

        const amount0Min = amount0Denom
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1Denom
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.abiService.getContract(args.pairAddress);
        const interaction: Interaction = contract.methods.addLiquidity([
            new BigUIntValue(amount0Denom),
            new BigUIntValue(amount1Denom),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidity));

        return transaction.toPlainObject();
    }

    async reclaimTemporaryFunds(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(pairAddress);
        const interaction: Interaction = contract.methods.reclaimTemporaryFunds(
            [],
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        return transaction.toPlainObject();
    }

    async removeLiquidity(
        args: RemoveLiquidityArgs,
    ): Promise<TransactionModel> {
        const firstToken = await this.pairService.getFirstToken(
            args.pairAddress,
        );
        const secondToken = await this.pairService.getSecondToken(
            args.pairAddress,
        );
        const lpToken = await this.context.getTokenMetadata(
            args.liquidityTokenID,
        );
        const liquidityDenom = this.context.toBigNumber(
            args.liquidity,
            lpToken,
        );

        const liquidityPosition = await this.pairService.getLiquidityPosition(
            args.pairAddress,
            args.liquidity,
        );

        const amount0Min = this.context
            .toBigNumber(liquidityPosition.firstTokenAmount, firstToken)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = this.context
            .toBigNumber(liquidityPosition.secondTokenAmount, secondToken)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.abiService.getContract(args.pairAddress);
        const transactionArgs = [
            BytesValue.fromUTF8(args.liquidityTokenID),
            new BigUIntValue(liquidityDenom),
            BytesValue.fromUTF8('removeLiquidity'),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.removeLiquidity),
        );
    }

    async swapTokensFixedInput(
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.pairAddress);
        const tokenIn = await this.context.getTokenMetadata(args.tokenInID);
        const tokenOut = await this.context.getTokenMetadata(args.tokenOutID);

        const amountInDenom = this.context.toBigNumber(args.amountIn, tokenIn);
        const amountOutDenom = this.context.toBigNumber(
            args.amountOut,
            tokenOut,
        );
        const amountOutDenomMin = amountOutDenom
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(amountInDenom),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(args.tokenOutID),
            new BigUIntValue(amountOutDenomMin),
        ];

        return await this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async swapTokensFixedOutput(
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.pairAddress);
        const tokenIn = await this.context.getTokenMetadata(args.tokenInID);
        const tokenOut = await this.context.getTokenMetadata(args.tokenOutID);

        const amountInDenom = this.context.toBigNumber(args.amountIn, tokenIn);
        const amountOutDenom = this.context.toBigNumber(
            args.amountOut,
            tokenOut,
        );
        const amountInDenomMax = amountInDenom
            .multipliedBy(1 + args.tolerance)
            .integerValue();
        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(amountInDenomMax),
            BytesValue.fromUTF8('swapTokensFixedOutput'),
            BytesValue.fromUTF8(args.tokenOutID),
            new BigUIntValue(amountOutDenom),
        ];

        return await this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async esdtTransfer(args: ESDTTransferArgs): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.pairAddress);
        const token = await this.context.getTokenMetadata(args.token);

        const transactionArgs = [
            BytesValue.fromUTF8(args.token),
            new BigUIntValue(this.context.toBigNumber(args.amount, token)),
            BytesValue.fromUTF8('acceptEsdtPayment'),
        ];

        return await this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }
}
