import { Address } from '@multiversx/sdk-core';
import { BigNumber } from 'bignumber.js';
import { BinaryUtils } from '@multiversx/sdk-nestjs-common';
import moment from 'moment';

export const SECONDS_TIMESTAMP_LENGTH = 10;
export const MILLISECONDS_TIMESTAMP_LENGTH = 13;

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

export function isValidUnixTimestamp(value: string): boolean {
    if (/^\d+$/.test(value) === false) {
        return false;
    }

    const timestamp = Number(value);

    if (value.length === SECONDS_TIMESTAMP_LENGTH) {
        return moment.unix(timestamp).isValid();
    }

    if (value.length === MILLISECONDS_TIMESTAMP_LENGTH) {
        return moment(timestamp).isValid();
    }

    return false;
}
