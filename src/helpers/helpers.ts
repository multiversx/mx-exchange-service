import { Address } from '@multiversx/sdk-core';
import { BigNumber } from 'bignumber.js';
import { BinaryUtils } from '@multiversx/sdk-nestjs-common';

export function encodeTransactionData(data: string): string {
    const delimiter = '@';

    const args = data.split(delimiter);

    let encoded = args.shift();
    for (const arg of args) {
        encoded += delimiter;

        const address = encodeAddress(arg);
        if (address !== undefined) {
            encoded += address;
        } else {
            const bigNumber = decodeBigNumber(arg);
            if (bigNumber !== undefined) {
                const hex = bigNumber.toString(16);
                encoded += hex.length % 2 === 1 ? '0' + hex : hex;
            } else {
                encoded += Buffer.from(arg).toString('hex');
            }
        }
    }

    return BinaryUtils.base64Encode(encoded);
}

function decodeBigNumber(bignumber: string) {
    try {
        const bigNumber = new BigNumber(bignumber);
        return bigNumber.isPositive() ? bigNumber : undefined;
    } catch (error) {
        return undefined;
    }
}

function encodeAddress(str: string): string | undefined {
    try {
        return new Address(str).hex();
    } catch {
        return undefined;
    }
}

export function ruleOfThree(
    part: BigNumber,
    total: BigNumber,
    value: BigNumber,
): BigNumber {
    return part.multipliedBy(value).dividedBy(total).integerValue();
}

export function awsOneYear(): string {
    return '365d';
}

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
