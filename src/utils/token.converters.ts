import BigNumber from 'bignumber.js';

export function decimalToHex(d: number | BigNumber): string {
    const h = d.toString(16);
    return h.length % 2 ? '0' + h : h;
}

export const denominateAmount = (
    tokenAmount: string,
    decimals: number,
): BigNumber => new BigNumber(tokenAmount).multipliedBy(`1e-${decimals}`);

export const computeValueUSD = (
    amount: string,
    decimals: number,
    priceUSD: string,
): BigNumber => denominateAmount(amount, decimals).times(priceUSD);

export const tokenCollection = (tokenID: string): string => {
    const split = tokenID.split('-');
    return `${split[0]}-${split[1]}`;
};

export const tokenNonce = (tokenID: string): number => {
    const tokenNonceHex = tokenID.split('-')[2];
    return parseInt(tokenNonceHex, 16);
};

export const tokenIdentifier = (
    tokenID: string,
    tokenNonce: number,
): string => {
    return `${tokenID}-${decimalToHex(tokenNonce)}`;
};
