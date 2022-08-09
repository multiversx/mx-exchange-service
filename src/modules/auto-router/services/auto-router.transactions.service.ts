import {
    Address,
    BigUIntValue,
    BytesValue,
    TokenPayment,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig, elrondConfig, gasConfig } from 'src/config';
import { MultiSwapTokensArgs } from 'src/modules/auto-router/models/multi-swap-tokens.args';
import { isSpreadTooBig } from 'src/modules/pair/pair.utils';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { SWAP_TYPE } from '../models/auto-route.model';

@Injectable()
export class AutoRouterTransactionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly transactionsWrapService: TransactionsWrapService,
        private readonly pairGetter: PairGetterService,
        private readonly contextGetter: ContextGetterService,
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
                ? await this.multiPairFixedInputSwaps(args, amountIn.toFixed())
                : await this.multiPairFixedOutputSwaps(
                      args,
                      amountIn.toFixed(),
                  );

        transactions.push(
            contract.methodsExplicit
                .multiPairSwap(transactionArgs)
                .withSingleESDTTransfer(
                    TokenPayment.fungibleFromBigInteger(
                        args.tokenRoute[0],
                        amountIn.integerValue(),
                    ),
                )
                .withGasLimit(gasLimit)
                .withChainID(elrondConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        if (unwrapTransaction) transactions.push(unwrapTransaction);

        return transactions;
    }

    private async multiPairFixedInputSwaps(
        args: MultiSwapTokensArgs,
        amountIn: string,
    ): Promise<any[]> {
        const swaps = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;
        const [tokenIn, tokenInPriceUSD] = await Promise.all([
            this.contextGetter.getTokenMetadata(args.tokenRoute[0]),
            this.pairGetter.getTokenPriceUSD(args.tokenRoute[0]),
        ]);
        const amountInUSD = computeValueUSD(
            amountIn,
            tokenIn.decimals,
            tokenInPriceUSD,
        );

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

            const intermediaryTokenOutID = args.tokenRoute[index + 1];
            const [
                intermediaryTokenOut,
                intermediaryTokenOutPriceUSD,
            ] = await Promise.all([
                this.contextGetter.getTokenMetadata(intermediaryTokenOutID),
                this.pairGetter.getTokenPriceUSD(intermediaryTokenOutID),
            ]);

            const amountOutMinUSD = computeValueUSD(
                amountOutMin.toFixed(),
                intermediaryTokenOut.decimals,
                intermediaryTokenOutPriceUSD,
            );

            if (isSpreadTooBig(amountInUSD, amountOutMinUSD)) {
                throw new Error('Spread too big!');
            }

            swaps.push(
                ...[
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(intermediaryTokenOutID),
                    new BigUIntValue(amountOutMin),
                ],
            );
        }
        return swaps;
    }

    private async multiPairFixedOutputSwaps(
        args: MultiSwapTokensArgs,
        amountIn: string,
    ): Promise<any[]> {
        const swaps = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;

        const [tokenIn, tokenInPriceUSD] = await Promise.all([
            this.contextGetter.getTokenMetadata(args.tokenRoute[0]),
            this.pairGetter.getTokenPriceUSD(args.tokenRoute[0]),
        ]);

        const amountInUSD = computeValueUSD(
            amountIn,
            tokenIn.decimals,
            tokenInPriceUSD,
        );

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

            const intermediaryTokenOutID = args.tokenRoute[index + 1];
            const [
                intermediaryTokenOut,
                intermediaryTokenOutPriceUSD,
            ] = await Promise.all([
                this.contextGetter.getTokenMetadata(intermediaryTokenOutID),
                this.pairGetter.getTokenPriceUSD(intermediaryTokenOutID),
            ]);
            const amountOutUSD = computeValueUSD(
                amountOut,
                intermediaryTokenOut.decimals,
                intermediaryTokenOutPriceUSD,
            );

            if (isSpreadTooBig(amountInUSD, amountOutUSD)) {
                throw new Error('Spread too big!');
            }

            swaps.push(
                ...[
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(intermediaryTokenOutID),
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
                        BytesValue.fromHex(Address.fromString(address).hex()),
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
                        BytesValue.fromHex(Address.fromString(address).hex()),
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
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }
}
