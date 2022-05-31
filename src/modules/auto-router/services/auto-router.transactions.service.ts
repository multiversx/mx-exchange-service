import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { MultiSwapTokensArgs } from 'src/modules/auto-router/models/multi-swap-tokens.args';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AutoRouterTransactionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactionsService: ContextTransactionsService,
        private readonly transactionsWrapService: TransactionsWrapService,
    ) {}

    async multiPairSwap(
        sender: string,
        args: MultiSwapTokensArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [
            contract,
            wrapTransaction,
            unwrapTransaction,
        ] = await Promise.all([
            this.elrondProxy.getRouterSmartContract(),
            this.wrapIfNeeded(
                sender,
                args.tokenInID,
                args.intermediaryAmounts[0],
            ),
            this.unwrapIfNeeded(
                sender,
                args.tokenOutID,
                args.intermediaryAmounts[args.intermediaryAmounts.length - 1],
            ),
        ]);

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenRoute[0]),
            new BigUIntValue(new BigNumber(args.intermediaryAmounts[0])),
            BytesValue.fromUTF8('multiPairSwap'),
        ];

        if (wrapTransaction) transactions.push(wrapTransaction);

        for (const [index, address] of args.addressRoute.entries()) {
            /*const amountOutMin = new BigNumber(1)
                .dividedBy(new BigNumber(1).plus(args.tolerance))
                .multipliedBy(args.intermediaryAmounts[index + 1])
                .integerValue();*/
            transactionArgs.push(
                ...[
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(
                        new BigNumber(args.intermediaryAmounts[index + 1]),
                    ),
                ],
            );
        }

        transactions.push(
            this.contextTransactionsService.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(
                    args.addressRoute.length *
                        gasConfig.router.multiPairSwapMultiplier,
                ),
            ),
        );

        if (unwrapTransaction) transactions.push(unwrapTransaction);

        return transactions;
    }

    async wrapIfNeeded(sender, tokenID, amount): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(sender, tokenID, amount): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }
}
