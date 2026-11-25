import {
    getAmountIn,
    getAmountOut,
    getTokenForGivenPosition,
    zapLiquidityAmounts,
} from '../pair.utils';

// Pair contract math (mx-exchange-sc amm.rs, liquidity_pool.rs)
const MAX = 100000n;
const scAmountOut = (a: bigint, ri: bigint, ro: bigint, fee: bigint) =>
    (a * (MAX - fee) * ro) / (ri * MAX + a * (MAX - fee));
const scAmountIn = (o: bigint, ri: bigint, ro: bigint, fee: bigint) =>
    (ri * o * MAX) / ((ro - o) * (MAX - fee)) + 1n;
const scTokenForPosition = (l: bigint, r: bigint, s: bigint) => (l * r) / s;

// Pair set_optimal_amounts on existing liquidity
function scOptimalAmounts(
    first: bigint,
    second: bigint,
    r0: bigint,
    r1: bigint,
): [bigint, bigint] {
    const secondOptimal = (first * r1) / r0;
    if (secondOptimal <= second) {
        return [first, secondOptimal];
    }
    return [(second * r0) / r1, second];
}

// auto-pos-creator: swap half on the pair, then addLiquidity
function scZap(
    amount: bigint,
    inIsFirst: boolean,
    r0: bigint,
    r1: bigint,
    fee: bigint,
    special: bigint,
): [bigint, bigint] {
    const swapped = amount / 2n;
    const kept = amount - swapped;
    const [ri, ro] = inIsFirst ? [r0, r1] : [r1, r0];
    const received = scAmountOut(swapped, ri, ro, fee);
    const ri2 = ri + swapped - (swapped * special) / MAX;
    const ro2 = ro - received;
    return inIsFirst
        ? scOptimalAmounts(kept, received, ri2, ro2)
        : scOptimalAmounts(received, kept, ro2, ri2);
}

// Uniswap V2 library, fee 997/1000
const uniAmountOut = (a: bigint, ri: bigint, ro: bigint) =>
    (a * 997n * ro) / (ri * 1000n + a * 997n);

function randomCases(count: number) {
    let seed = 7;
    const next = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return BigInt(seed);
    };
    return Array.from({ length: count }, () => {
        const reserveIn = (next() + 1n) * next() * 1000003n + next();
        const reserveOut = (next() + 1n) * next() * 999983n + next();
        const amount = (((next() + 1n) * next()) % (reserveIn / 10n)) + 1n;
        return { reserveIn, reserveOut, amount };
    });
}

describe('pair utils', () => {
    const fees = [100n, 200n, 250n, 300n, 1000n];
    const cases = randomCases(3000);

    it('getAmountOut matches the pair contract', () => {
        for (const fee of fees) {
            for (const { reserveIn, reserveOut, amount } of cases) {
                const result = getAmountOut(
                    amount.toString(),
                    reserveIn.toString(),
                    reserveOut.toString(),
                    Number(fee) / 100000,
                );
                expect(result.toFixed()).toEqual(
                    scAmountOut(amount, reserveIn, reserveOut, fee).toString(),
                );
            }
        }
    });

    it('getAmountOut matches Uniswap V2 at a 0.3% fee', () => {
        for (const { reserveIn, reserveOut, amount } of cases) {
            const result = getAmountOut(
                amount.toString(),
                reserveIn.toString(),
                reserveOut.toString(),
                0.003,
            );
            expect(result.toFixed()).toEqual(
                uniAmountOut(amount, reserveIn, reserveOut).toString(),
            );
        }
    });

    it('getAmountIn matches the pair contract', () => {
        for (const fee of fees) {
            for (const { reserveIn, reserveOut, amount } of cases) {
                const amountOut = (amount % (reserveOut / 2n)) + 1n;
                const result = getAmountIn(
                    amountOut.toString(),
                    reserveIn.toString(),
                    reserveOut.toString(),
                    Number(fee) / 100000,
                );
                expect(result.toFixed()).toEqual(
                    scAmountIn(
                        amountOut,
                        reserveIn,
                        reserveOut,
                        fee,
                    ).toString(),
                );
            }
        }
    });

    it('getTokenForGivenPosition matches the pair contract', () => {
        for (const { reserveIn, reserveOut, amount } of cases) {
            const supply = reserveOut;
            const liquidity = amount % supply;
            const result = getTokenForGivenPosition(
                liquidity.toString(),
                reserveIn.toString(),
                supply.toString(),
            );
            expect(result.toFixed()).toEqual(
                scTokenForPosition(liquidity, reserveIn, supply).toString(),
            );
        }
    });

    describe('zapLiquidityAmounts', () => {
        // Payment as a share of the zapped token reserve, in basis points
        const sharesBp = [1n, 10n, 50n, 100n, 300n, 1000n, 3000n];
        const feeModes = [
            [300n, 0n],
            [300n, 50n],
            [100n, 0n],
            [1000n, 250n],
        ];

        it.each([true, false])(
            'matches the contract when the input is first: %s',
            (inIsFirst) => {
                for (const [fee, special] of feeModes) {
                    for (const { reserveIn, reserveOut, amount } of cases.slice(
                        0,
                        300,
                    )) {
                        const [r0, r1] = inIsFirst
                            ? [reserveIn, reserveOut]
                            : [reserveOut, reserveIn];
                        for (const bp of sharesBp) {
                            const payment =
                                (reserveIn * bp) / 10000n + (amount % 1000n);
                            const result = zapLiquidityAmounts(
                                payment.toString(),
                                inIsFirst,
                                r0.toString(),
                                r1.toString(),
                                Number(fee) / 100000,
                                Number(special) / 100000,
                            );
                            expect(result.map((a) => a.toFixed())).toEqual(
                                scZap(
                                    payment,
                                    inIsFirst,
                                    r0,
                                    r1,
                                    fee,
                                    special,
                                ).map(String),
                            );
                        }
                    }
                }
            },
        );
    });
});
