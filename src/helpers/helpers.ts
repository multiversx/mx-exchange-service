import { BigNumber } from 'bignumber.js';

export function base64DecodeBinary(str: string): Buffer {
    return Buffer.from(str, 'base64');
}

export function base64Decode(str: string): string {
    return base64DecodeBinary(str).toString('binary');
}

export function ruleOfThree(
    part: BigNumber,
    total: BigNumber,
    value: BigNumber,
): BigNumber {
    return part
        .multipliedBy(value)
        .dividedBy(total)
        .integerValue();
}
