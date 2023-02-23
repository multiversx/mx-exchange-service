import { Address } from '@multiversx/sdk-core';
import { BigNumber } from 'bignumber.js';

export function base64DecodeBinary(str: string): Buffer {
    return Buffer.from(str, 'base64');
}

export function base64Decode(str: string): string {
    return base64DecodeBinary(str).toString('binary');
}

export function base64Encode(str: string): string {
    return Buffer.from(str, 'binary').toString('base64');
}

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

    return base64Encode(encoded);
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

export function oneSecond(): number {
    return 1;
}

export function oneMinute(): number {
    return oneSecond() * 60;
}

export function oneHour(): number {
    return oneMinute() * 60;
}

export function oneDay(): number {
    return oneHour() * 24;
}

export function oneWeek(): number {
    return oneDay() * 7;
}

export function oneMonth(): number {
    return oneDay() * 30;
}

export function awsOneMinute(): string {
    return '1m';
}

export function awsOneHour(): string {
    return '1h';
}

export function awsOneDay(): string {
    return '1d';
}

export function awsOneWeek(): string {
    return '7d';
}

export function awsOneMonth(): string {
    return '30d';
}

export function awsOneYear(): string {
    return '365d';
}

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
