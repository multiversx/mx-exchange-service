import { UserInputError } from '@nestjs/apollo';
import { liquidityMin, swapMaxIn, swapMinOut } from '../slippage.utils';

// Uniswap V2 SDK references, exact integer math on basis points
const refSwapMinOut = (a: bigint, bp: bigint) => (a * 10000n) / (10000n + bp);
const refSwapMaxIn = (a: bigint, bp: bigint) => (a * (10000n + bp)) / 10000n;
const refLiquidityMin = (a: bigint, bp: bigint) => (a * (10000n - bp)) / 10000n;

function randomAmounts(count: number): bigint[] {
    let seed = 12345;
    const next = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed;
    };
    return Array.from(
        { length: count },
        () => BigInt(next()) * BigInt(next()) * 1000003n + BigInt(next()),
    );
}

describe('slippage utils', () => {
    const tolerancesBp = [1n, 10n, 30n, 50n, 100n, 300n, 500n];
    const amounts = randomAmounts(2000);

    it('swapMinOut equals the SDK floor of a / (1 + t)', () => {
        for (const bp of tolerancesBp) {
            for (const a of amounts) {
                expect(
                    swapMinOut(a.toString(), Number(bp) / 10000).toFixed(),
                ).toEqual(refSwapMinOut(a, bp).toString());
            }
        }
    });

    it('swapMaxIn equals the SDK floor of a * (1 + t)', () => {
        for (const bp of tolerancesBp) {
            for (const a of amounts) {
                expect(
                    swapMaxIn(a.toString(), Number(bp) / 10000).toFixed(),
                ).toEqual(refSwapMaxIn(a, bp).toString());
            }
        }
    });

    it('liquidityMin equals the floor of a * (1 - t)', () => {
        for (const bp of tolerancesBp) {
            for (const a of amounts) {
                expect(
                    liquidityMin(a.toString(), Number(bp) / 10000).toFixed(),
                ).toEqual(refLiquidityMin(a, bp).toString());
            }
        }
    });

    it('rounds down where half-up would round up', () => {
        expect(swapMaxIn('999', 0.005).toFixed()).toEqual('1003');
        expect(liquidityMin('1100', 0.005).toFixed()).toEqual('1094');
        expect(swapMinOut('2060', 0.005).toFixed()).toEqual('2049');
    });

    it('divides exactly for large amounts', () => {
        const amount = '1' + '0'.repeat(30);
        expect(swapMinOut(amount, 0.01).toFixed()).toEqual(
            '990099009900990099009900990099',
        );
    });

    it('returns the amount unchanged at zero tolerance', () => {
        expect(swapMinOut('123456789', 0).toFixed()).toEqual('123456789');
        expect(swapMaxIn('123456789', 0).toFixed()).toEqual('123456789');
        expect(liquidityMin('123456789', 0).toFixed()).toEqual('123456789');
    });

    it('rejects minimums that are not positive', () => {
        expect(() => swapMinOut('1', 0.5)).toThrow(UserInputError);
        expect(() => liquidityMin('1', 0.5)).toThrow(UserInputError);
        expect(() => liquidityMin('1000', 1)).toThrow(UserInputError);
        expect(() => swapMinOut('1000', -1)).toThrow(UserInputError);
    });
});
