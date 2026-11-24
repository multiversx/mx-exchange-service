import {
    getAmountIn,
    getAmountOut,
    getTokenForGivenPosition,
} from '../pair.utils';

// Pair contract math (mx-exchange-sc amm.rs, liquidity_pool.rs)
const MAX = 100000n;
const scAmountOut = (a: bigint, ri: bigint, ro: bigint, fee: bigint) =>
    (a * (MAX - fee) * ro) / (ri * MAX + a * (MAX - fee));
const scAmountIn = (o: bigint, ri: bigint, ro: bigint, fee: bigint) =>
    (ri * o * MAX) / ((ro - o) * (MAX - fee)) + 1n;
const scTokenForPosition = (l: bigint, r: bigint, s: bigint) => (l * r) / s;

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
});
