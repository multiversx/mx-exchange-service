import BigNumber from 'bignumber.js';

export function convertTokenToDecimal(
    tokenAmount: string,
    decimals: number,
): BigNumber {
    return new BigNumber(tokenAmount).multipliedBy(`1e-${decimals}`);
}
