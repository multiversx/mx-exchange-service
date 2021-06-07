import { Injectable } from '@nestjs/common';
import { gasConfig } from '../../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../models/transaction.model';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../utils/context.service';
import { PairService } from '../../pair/pair.service';
import {
    AddLiquidityProxyArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from '../dto/proxy-pair.args';
import { getContract } from '../utils';

@Injectable()
export class TransactionsProxyPairService {
    constructor(
        private pairService: PairService,
        private context: ContextService,
    ) {}

    async addLiquidityProxy(
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await getContract();
        const amount0 = new BigNumber(args.amount0);
        const amount1 = new BigNumber(args.amount1);

        const amount0Min = amount0.multipliedBy(1 - args.tolerance);
        const amount1Min = amount1.multipliedBy(1 - args.tolerance);

        const interaction: Interaction = contract.methods.addLiquidityProxy([
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            BytesValue.fromUTF8(args.token0ID),
            new U32Value(args.token0Nonce ? args.token0Nonce : 0),
            new BigUIntValue(amount0),
            new BigUIntValue(amount0Min),
            BytesValue.fromUTF8(args.token1ID),
            new U32Value(args.token1Nonce ? args.token1Nonce : 0),
            new BigUIntValue(amount1),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidityProxy));

        return transaction.toPlainObject();
    }

    async removeLiquidityProxy(
        args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await getContract();
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            args.pairAddress,
            args.liquidity,
        );
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedLpTokenID),
            new U32Value(args.wrappedLpTokenNonce),
            new BigUIntValue(new BigNumber(args.liquidity)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('removeLiquidityProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async esdtTransferProxy(
        args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        const contract = await getContract();

        if (!args.tokenNonce) {
            const transactionArgs = [
                BytesValue.fromUTF8(args.tokenID),
                new BigUIntValue(new BigNumber(args.amount)),
                BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
                BytesValue.fromHex(new Address(args.pairAddress).hex()),
            ];

            return this.context.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.esdtTransfer),
            );
        }

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async reclaimTemporaryFundsProxy(
        args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.reclaimTemporaryFundsProxy(
            [
                BytesValue.fromUTF8(args.firstTokenID),
                new U32Value(args.firstTokenNonce ? args.firstTokenNonce : 0),
                BytesValue.fromUTF8(args.secondTokenID),
                new U32Value(args.secondTokenNonce ? args.secondTokenNonce : 0),
            ],
        );

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        return transaction.toPlainObject();
    }
}
