import { Address } from '@elrondnetwork/erdjs/out';
import { BigNumber } from 'bignumber.js';
import { isNumber } from 'class-validator';

export function base64DecodeBinary(str: string): Buffer {
    return Buffer.from(str, 'base64');
}

export function base64Decode(str: string): string {
    return base64DecodeBinary(str).toString('binary');
}

export function base64Encode(str: string): string {
    return Buffer.from(str, 'binary').toString('base64');
}

export function decodeTransactionData(data: string): string {
    const delimiter = '@';

    const args = base64Decode(data).split(delimiter);

    let decoded = args.shift();
    for (const arg of args) {
        decoded += delimiter;

        const address = decodeAddress(arg);
        if (address) {
            decoded += address;
        } else {
            const number = parseInt(arg, 16);
            if (isNumber(number) && !number.toString().includes('e'))
                decoded +=
                    number.toString().length % 2 === 1
                        ? '0' + number.toString()
                        : number.toString();
            else {
                decoded += Buffer.from(arg, 'hex').toString();
            }
        }
    }

    return decoded;
}

export function encodeTransactionData(data: string): string {
    const delimiter = '@';

    const args = data.split(delimiter);

    let encoded = args.shift();
    for (const arg of args) {
        encoded += delimiter;

        if (decodeAddress(arg)) {
            encoded += Address.fromString(arg).hex();
        } else {
            if (isNumber(parseInt(arg))) encoded += deci2hex(arg, true);
            else {
                encoded += ascii2hex(arg);
            }
        }
    }

    return base64Encode(encoded);
}

function decodeAddress(str: string): string | undefined {
    try {
        if (str.length === 62) {
            return Address.fromString(str).bech32();
        }
        return Address.fromHex(str).bech32();
    } catch {
        return undefined;
    }
}

function ascii2hex(str: string): string {
    const res = [];
    const { length: len } = str;
    for (let n = 0, l = len; n < l; n++) {
        const hex = Number(str.charCodeAt(n)).toString(16);
        res.push(hex);
    }
    return res.join('');
}

function deci2hex(d, toEvenLength = false): string {
    var h = (+d).toString(16);
    return toEvenLength && h.length % 2 === 1 ? '0' + h : h;
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
