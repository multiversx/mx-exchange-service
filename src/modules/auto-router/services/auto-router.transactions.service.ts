import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    TokenTransfer,
    TypedValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { MultiSwapTokensArgs } from 'src/modules/auto-router/models/multi-swap-tokens.args';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { TransactionModel } from '../../../models/transaction.model';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { SWAP_TYPE } from '../models/auto-route.model';

@Injectable()
export class AutoRouterTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly transactionsWrapService: WrapTransactionsService,
    ) {}

    async multiPairSwap(
        sender: string,
        args: MultiSwapTokensArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [contract, wrapTransaction, unwrapTransaction] =
            await Promise.all([
                this.mxProxy.getRouterSmartContract(),
                this.wrapIfNeeded(
                    sender,
                    args.tokenInID,
                    args.intermediaryAmounts[0],
                ),
                this.unwrapIfNeeded(
                    sender,
                    args.tokenOutID,
                    args.intermediaryAmounts[
                        args.intermediaryAmounts.length - 1
                    ],
                ),
            ]);

        if (wrapTransaction) transactions.push(wrapTransaction);

        const amountIn = new BigNumber(args.intermediaryAmounts[0]).plus(
            new BigNumber(args.intermediaryAmounts[0]).multipliedBy(
                args.swapType === SWAP_TYPE.fixedOutput ? args.tolerance : 0,
            ),
        );
        const gasLimit =
            args.addressRoute.length * gasConfig.router.multiPairSwapMultiplier;

        const transactionArgs =
            args.swapType == SWAP_TYPE.fixedInput
                ? this.multiPairFixedInputSwaps(args)
                : this.multiPairFixedOutputSwaps(args);

        transactions.push(
            contract.methodsExplicit
                .multiPairSwap(transactionArgs)
                .withSingleESDTTransfer(
                    TokenTransfer.fungibleFromBigInteger(
                        args.tokenRoute[0],
                        amountIn.integerValue(),
                    ),
                )
                .withGasLimit(gasLimit)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        if (unwrapTransaction) transactions.push(unwrapTransaction);

        return transactions;
    }

    multiPairFixedInputSwaps(args: MultiSwapTokensArgs): TypedValue[] {
        const swaps: TypedValue[] = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;

        for (const [index, address] of args.addressRoute.entries()) {
            const intermediaryToleranceMultiplier =
                args.addressRoute.length - index;

            const toleranceAmount = new BigNumber(
                args.intermediaryAmounts[index + 1],
            ).multipliedBy(
                intermediaryToleranceMultiplier * intermediaryTolerance,
            );

            const amountOutMin = new BigNumber(
                args.intermediaryAmounts[index + 1],
            )
                .minus(toleranceAmount)
                .integerValue();

            swaps.push(
                ...[
                    new AddressValue(Address.fromString(address)),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(amountOutMin),
                ],
            );
        }
        return swaps;
    }

    multiPairFixedOutputSwaps(args: MultiSwapTokensArgs): TypedValue[] {
        const swaps: TypedValue[] = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;

        for (const [index, address] of args.addressRoute.entries()) {
            // method #1
            // [A -> B -> C -> D], all with swap_tokens_fixed_output
            // overall: less input, more gas, rest/dust in A, B & C
            const intermediaryToleranceMultiplier =
                args.addressRoute.length - index - 1;

            const toleranceAmount = new BigNumber(
                args.intermediaryAmounts[index + 1],
            ).multipliedBy(
                intermediaryToleranceMultiplier * intermediaryTolerance,
            );

            const amountOut = new BigNumber(args.intermediaryAmounts[index + 1])
                .plus(toleranceAmount)
                .integerValue()
                .toFixed();

            swaps.push(
                ...[
                    new AddressValue(Address.fromString(address)),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(new BigNumber(amountOut)),
                ],
            );
            // method #2
            // [A -> B -> C] with swap_tokens_fixed_input + [C -> D] with swap_tokens_fixed_output
            // overall: more input, less gas, rest in C
            /*if (index < args.addressRoute.length - 1) {
                const amountOutMin = new BigNumber(
                    args.intermediaryAmounts[index + 1],
                )
                    .plus(
                        new BigNumber(
                            args.intermediaryAmounts[index + 1],
                        ).multipliedBy(
                            (args.addressRoute.length - index - 1) *
                                intermediaryTolerance,
                        ),
                    )
                    .integerValue()
                    .toFixed();
                console.log(
                    'swapTokensFixedInput with amountOutMin ',
                    amountOutMin,
                );

                swaps.push(
                    ...[
                        new AddressValue(Address.fromString(address)),
                        BytesValue.fromUTF8('swapTokensFixedInput'),
                        BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                        new BigUIntValue(
                            new BigNumber(args.intermediaryAmounts[index + 1]),
                        ),
                    ],
                );
            } else {
                console.log('swapTokensFixedOutput');
                swaps.push(
                    ...[
                        new AddressValue(Address.fromString(address)),
                        BytesValue.fromUTF8('swapTokensFixedOutput'),
                        BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                        new BigUIntValue(
                            new BigNumber(args.intermediaryAmounts[index + 1]),
                        ),
                    ],
                );
            }*/
        }
        return swaps;
    }

    async wrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === mxConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === mxConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }
}
