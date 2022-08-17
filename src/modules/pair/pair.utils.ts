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

    return numerator.dividedBy(denominator).integerValue();
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
    if (tokenOutReservesBig.isLessThan(tokenOutAmountBig)) {
        return new BigNumber(0).integerValue();
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

    return numerator
        .dividedBy(denominator)
        .plus(1)
        .integerValue();
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

    return liquidityBig
        .multipliedBy(tokenReservesBig)
        .dividedBy(totalSupplyBig)
        .integerValue();
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
