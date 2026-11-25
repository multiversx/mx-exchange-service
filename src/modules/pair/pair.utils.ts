import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';

export function quote(
    tokenInAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
) {
    const tokenInAmountBig = new BigNumber(tokenInAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);

    if (tokenInReservesBig.isZero()) {
        return new BigNumber(0);
    }

    return tokenInAmountBig
        .multipliedBy(tokenOutReservesBig)
        .dividedBy(tokenInReservesBig);
}

export function getAmountOut(
    tokenInAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
    fee: number,
) {
    const tokenInAmountBig = new BigNumber(tokenInAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);

    const amountInWithFee = tokenInAmountBig.multipliedBy(
        constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS -
            fee * constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS,
    );
    const numerator = amountInWithFee.multipliedBy(tokenOutReservesBig);
    const denominator = tokenInReservesBig
        .multipliedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
        .plus(amountInWithFee);

    return numerator.idiv(denominator);
}

export function getAmountIn(
    tokenOutAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
    fee: number,
) {
    const tokenOutAmountBig = new BigNumber(tokenOutAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);
    if (tokenOutReservesBig.isLessThanOrEqualTo(tokenOutAmountBig)) {
        return new BigNumber(0);
    }
    const numerator = tokenInReservesBig
        .multipliedBy(tokenOutAmountBig)
        .multipliedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS);
    const denominator = tokenOutReservesBig
        .minus(tokenOutAmountBig)
        .multipliedBy(
            constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS -
                fee * constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS,
        );

    return numerator.idiv(denominator).plus(1);
}

export function getTokenForGivenPosition(
    liquidity: string,
    tokenReserves: string,
    totalSupply: string,
) {
    if (totalSupply === '0') {
        return new BigNumber(0);
    }

    const liquidityBig = new BigNumber(liquidity);
    const tokenReservesBig = new BigNumber(tokenReserves);
    const totalSupplyBig = new BigNumber(totalSupply);

    return liquidityBig.multipliedBy(tokenReservesBig).idiv(totalSupplyBig);
}

// Reserves after a fixed-input swap; the special fee leaves the pool
export function reservesAfterSwap(
    amountIn: BigNumber.Value,
    amountOut: BigNumber.Value,
    reserveIn: BigNumber.Value,
    reserveOut: BigNumber.Value,
    specialFeePercent: number,
): [BigNumber, BigNumber] {
    const specialFee = new BigNumber(amountIn)
        .multipliedBy(specialFeePercent)
        .integerValue(BigNumber.ROUND_DOWN);

    return [
        new BigNumber(reserveIn).plus(amountIn).minus(specialFee),
        new BigNumber(reserveOut).minus(amountOut),
    ];
}

// Amounts addLiquidity uses from the desired ones, as the pair contract
export function optimalLiquidityAmounts(
    firstAmount: BigNumber,
    secondAmount: BigNumber,
    firstReserve: BigNumber,
    secondReserve: BigNumber,
): [BigNumber, BigNumber] {
    const secondOptimal = firstAmount
        .multipliedBy(secondReserve)
        .idiv(firstReserve);
    if (secondOptimal.isLessThanOrEqualTo(secondAmount)) {
        return [firstAmount, secondOptimal];
    }

    return [
        secondAmount.multipliedBy(firstReserve).idiv(secondReserve),
        secondAmount,
    ];
}

// Position creator zap: swap half on the pair, add the rest as liquidity
export function zapLiquidityAmounts(
    amount: string,
    tokenInIsFirst: boolean,
    reserves0: string,
    reserves1: string,
    totalFeePercent: number,
    specialFeePercent: number,
): [BigNumber, BigNumber] {
    const swapped = new BigNumber(amount).idiv(2);
    const kept = new BigNumber(amount).minus(swapped);
    const [reserveIn, reserveOut] = tokenInIsFirst
        ? [reserves0, reserves1]
        : [reserves1, reserves0];

    const received = getAmountOut(
        swapped.toFixed(),
        reserveIn,
        reserveOut,
        totalFeePercent,
    );
    const [newReserveIn, newReserveOut] = reservesAfterSwap(
        swapped,
        received,
        reserveIn,
        reserveOut,
        specialFeePercent,
    );

    return tokenInIsFirst
        ? optimalLiquidityAmounts(kept, received, newReserveIn, newReserveOut)
        : optimalLiquidityAmounts(received, kept, newReserveOut, newReserveIn);
}

export function isSpreadTooBig(
    amountInUSD: BigNumber,
    amountOutUSD: BigNumber,
): boolean {
    return (
        amountOutUSD.isLessThan(
            amountInUSD.multipliedBy(1 - constantsConfig.MAX_SWAP_SPREAD),
        ) ||
        amountInUSD.isLessThan(
            amountOutUSD.multipliedBy(1 - constantsConfig.MAX_SWAP_SPREAD),
        )
    );
}
