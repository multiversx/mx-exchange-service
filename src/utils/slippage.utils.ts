import { UserInputError } from '@nestjs/apollo';
import BigNumber from 'bignumber.js';

// Slippage bounds follow Uniswap V2 conventions, always rounded down.

const ONE = new BigNumber(1);

// Fixed-input swap minimum: floor(amount / (1 + t))
export function swapMinOut(
    amount: BigNumber.Value,
    tolerance: number,
): BigNumber {
    return requirePositive(new BigNumber(amount).idiv(ONE.plus(tolerance)));
}

// Fixed-output swap maximum: floor(amount * (1 + t))
export function swapMaxIn(
    amount: BigNumber.Value,
    tolerance: number,
): BigNumber {
    return new BigNumber(amount)
        .multipliedBy(ONE.plus(tolerance))
        .integerValue(BigNumber.ROUND_DOWN);
}

// Add or remove liquidity minimum: floor(amount * (1 - t))
export function liquidityMin(
    amount: BigNumber.Value,
    tolerance: number,
): BigNumber {
    return requirePositive(
        new BigNumber(amount)
            .multipliedBy(ONE.minus(tolerance))
            .integerValue(BigNumber.ROUND_DOWN),
    );
}

// Contracts reject a minimum of 0, so fail early with a clear error
function requirePositive(min: BigNumber): BigNumber {
    if (!min.isFinite() || !min.isGreaterThan(0)) {
        throw new UserInputError('Amount too small for this tolerance');
    }
    return min;
}
