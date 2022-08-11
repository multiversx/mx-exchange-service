import {
    Address,
    BigUIntValue,
    BytesValue,
    TokenPayment,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
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
                ? await this.multiPairFixedInputSwaps(args)
                : await this.multiPairFixedOutputSwaps(args);

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
    ): Promise<any[]> {
        const swaps = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;

        for (const [index, address] of args.addressRoute.entries()) {
            await this.validateSwapTokens(
                args.tokenRoute[index],
                args.tokenRoute[index + 1],
                args.intermediaryAmounts[index],
                args.intermediaryAmounts[index + 1],
            );
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
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(amountOutMin),
                ],
            );
        }
        return swaps;
    }

    private async multiPairFixedOutputSwaps(
        args: MultiSwapTokensArgs,
    ): Promise<any[]> {
        const swaps = [];

        const intermediaryTolerance = args.tolerance / args.addressRoute.length;

        for (const [index, address] of args.addressRoute.entries()) {
            await this.validateSwapTokens(
                args.tokenRoute[index],
                args.tokenRoute[index + 1],
                args.intermediaryAmounts[index],
                args.intermediaryAmounts[index + 1],
            );
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
                    BytesValue.fromHex(Address.fromString(address).hex()),
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

    private async validateSwapTokens(
        tokenInID: string,
        tokenOutID: string,
        amountIn: string,
        amountOut: string,
    ): Promise<void> {
        const [
            tokenIn,
            tokenInPriceUSD,
            intermediaryTokenOut,
            intermediaryTokenOutPriceUSD,
        ] = await Promise.all([
            this.contextGetter.getTokenMetadata(tokenInID),
            this.pairGetter.getTokenPriceUSD(tokenInID),
            this.contextGetter.getTokenMetadata(tokenOutID),
            this.pairGetter.getTokenPriceUSD(tokenOutID),
        ]);

        const amountInUSD = computeValueUSD(
            amountIn,
            tokenIn.decimals,
            tokenInPriceUSD,
        );
        const amountOutUSD = computeValueUSD(
            amountOut,
            intermediaryTokenOut.decimals,
            intermediaryTokenOutPriceUSD,
        );

        if (isSpreadTooBig(amountInUSD, amountOutUSD)) {
            throw new Error(`Spread too big validating auto route swap transaction ${tokenInID} => ${tokenOutID}.
            amount in = ${amountIn}, usd value = ${amountInUSD};
            amount out = ${amountOut}, usd value = ${amountOutUSD}`);
        }
    }
}
