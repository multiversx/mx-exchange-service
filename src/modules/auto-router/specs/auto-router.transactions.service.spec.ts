import { Address, BigUIntValue, TypedValue } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { ComposableTasksAbiService } from 'src/modules/composable-tasks/services/composable.tasks.abi.service';
import { ComposableTasksTransactionService } from 'src/modules/composable-tasks/services/composable.tasks.transaction';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { SWAP_TYPE } from '../models/auto-route.model';
import { MultiSwapTokensArgs } from '../models/multi-swap-tokens.args';
import { AutoRouterTransactionService } from '../services/auto-router.transactions.service';

// Exact floor(a / (1 + t)) for a tolerance given in basis points
const refSwapMinOut = (a: string, bp: number) =>
    ((BigInt(a) * 10000n) / (10000n + BigInt(bp))).toString();

const pairAddress = (i: number) =>
    Address.newFromHex(i.toString(16).padStart(64, '0')).toBech32();

function routeArgs(
    hops: number,
    tolerance: number,
    swapType = SWAP_TYPE.fixedInput,
): MultiSwapTokensArgs {
    const tokens = ['WEGLD-123456', 'MEX-123456', 'USDC-123456', 'UTK-123456'];
    const amounts = [
        '1000000000000000000',
        '987158034397061298850',
        '4513487211654',
        '30876541246719887765',
    ];
    return {
        swapType,
        tokenInID: tokens[0],
        tokenOutID: tokens[hops],
        tokenRoute: tokens.slice(0, hops + 1),
        intermediaryAmounts: amounts.slice(0, hops + 1),
        addressRoute: Array.from({ length: hops }, (_, i) =>
            pairAddress(i + 1),
        ),
        tolerance,
    };
}

// Every swap operation is [pair, function, token out, amount]
const hopMinimums = (swaps: TypedValue[]) =>
    swaps
        .filter((_, i) => i % 4 === 3)
        .map((value) => (value as BigUIntValue).valueOf().toFixed());

describe('AutoRouterTransactionService', () => {
    const composeTasks = {
        getComposeTasksTransaction: jest.fn().mockResolvedValue({}),
    };
    const service = new AutoRouterTransactionService(
        {} as MXProxyService,
        {} as WrapTransactionsService,
        composeTasks as unknown as ComposableTasksTransactionService,
        {} as ComposableTasksAbiService,
    );

    beforeEach(() => composeTasks.getComposeTasksTransaction.mockClear());

    describe('multiPairFixedInputSwaps', () => {
        it.each([1, 2, 3])(
            'puts the whole tolerance on the last of %i hops',
            (hops) => {
                for (const bp of [50, 100]) {
                    const args = routeArgs(hops, bp / 10000);
                    const minimums = hopMinimums(
                        service.multiPairFixedInputSwaps(args),
                    );

                    expect(minimums).toEqual([
                        ...Array(hops - 1).fill('1'),
                        refSwapMinOut(args.intermediaryAmounts[hops], bp),
                    ]);
                }
            },
        );
    });

    describe('EGLD multi-hop composable minimum', () => {
        const tolerancesBp = [10, 50, 75, 100, 150, 153];

        // getComposeTasksTransaction(sender, payment, expectedOut, tasks)
        const expectedMinimum = () =>
            composeTasks.getComposeTasksTransaction.mock.calls[0][2].amount;

        it.each(tolerancesBp)(
            'wrap + swap at %i bp is floor(a/(1+t))',
            (bp) => {
                const args = routeArgs(2, bp / 10000);

                return service
                    .wrapEgldAndMultiSwapTransaction('erd1', '1', args)
                    .then(() => {
                        expect(expectedMinimum()).toEqual(
                            refSwapMinOut(args.intermediaryAmounts[2], bp),
                        );
                    });
            },
        );

        it.each(tolerancesBp)(
            'swap + unwrap at %i bp is floor(a/(1+t))',
            (bp) => {
                const args = routeArgs(2, bp / 10000);

                return service
                    .multiSwapAndUnwrapEgldTransaction('erd1', '1', args)
                    .then(() => {
                        expect(expectedMinimum()).toEqual(
                            refSwapMinOut(args.intermediaryAmounts[2], bp),
                        );
                    });
            },
        );

        it('keeps the exact output for fixed-output routes', async () => {
            const args = routeArgs(2, 0.01, SWAP_TYPE.fixedOutput);

            await service.wrapEgldAndMultiSwapTransaction('erd1', '1', args);

            expect(expectedMinimum()).toEqual(
                new BigNumber(args.intermediaryAmounts[2]).toFixed(),
            );
        });
    });
});
