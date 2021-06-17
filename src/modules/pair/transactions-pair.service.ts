import { Injectable } from '@nestjs/common';
import { BigUIntValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import { TransactionModel } from '../../models/transaction.model';
import { AbiPairService } from './abi-pair.service';
import {
    AddLiquidityArgs,
    ESDTTransferArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from './dto/pair.args';
import { PairService } from './pair.service';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../services/context/context.service';

@Injectable()
export class TransactionPairService {
    constructor(
        private abiService: AbiPairService,
        private pairService: PairService,
        private context: ContextService,
    ) {}

    async addLiquidity(args: AddLiquidityArgs): Promise<TransactionModel> {
        const amount0 = new BigNumber(args.amount0);
        const amount1 = new BigNumber(args.amount1);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.abiService.getContract(args.pairAddress);
        const interaction: Interaction = contract.methods.addLiquidity([
            new BigUIntValue(amount0),
            new BigUIntValue(amount1),
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
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            args.pairAddress,
            args.liquidity,
        );

        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.abiService.getContract(args.pairAddress);
        const transactionArgs = [
            BytesValue.fromUTF8(args.liquidityTokenID),
            new BigUIntValue(new BigNumber(args.liquidity)),
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

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = amountOut
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(amountIn),
            BytesValue.fromUTF8('swapTokensFixedInput'),
            BytesValue.fromUTF8(args.tokenOutID),
            new BigUIntValue(amountOutMin),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async swapTokensFixedOutput(
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.pairAddress);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountInMax = amountIn
            .multipliedBy(1 + args.tolerance)
            .integerValue();
        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(amountInMax),
            BytesValue.fromUTF8('swapTokensFixedOutput'),
            BytesValue.fromUTF8(args.tokenOutID),
            new BigUIntValue(amountOut),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.swapTokens),
        );
    }

    async esdtTransfer(args: ESDTTransferArgs): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.pairAddress);

        const transactionArgs = [
            BytesValue.fromUTF8(args.token),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromUTF8('acceptEsdtPayment'),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }
}
