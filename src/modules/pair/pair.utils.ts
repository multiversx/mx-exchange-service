import BigNumber from 'bignumber.js';

export function quote(
    tokenInAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
) {
    const tokenInAmountBig = new BigNumber(tokenInAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);

    return tokenInAmountBig
        .multipliedBy(tokenOutReservesBig)
        .dividedBy(tokenInReservesBig)
        .integerValue();
}

export function getAmountOut(
    tokenInAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
) {
    const tokenInAmountBig = new BigNumber(tokenInAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);

    const amountInWithFee = tokenInAmountBig.multipliedBy(100000 - 300);
    const numerator = amountInWithFee.multipliedBy(tokenOutReservesBig);
    const denominator = tokenInReservesBig
        .multipliedBy(100000)
        .plus(amountInWithFee);

    return numerator.dividedBy(denominator).integerValue();
}

export function getAmountIn(
    tokenOutAmount: string,
    tokenInReserves: string,
    tokenOutReserves: string,
) {
    const tokenOutAmountBig = new BigNumber(tokenOutAmount);
    const tokenInReservesBig = new BigNumber(tokenInReserves);
    const tokenOutReservesBig = new BigNumber(tokenOutReserves);

    const numerator = tokenInReservesBig
        .multipliedBy(tokenOutAmountBig)
        .multipliedBy(100000);
    const denominator = tokenOutReservesBig
        .minus(tokenOutAmountBig)
        .multipliedBy(100000 - 300);

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
