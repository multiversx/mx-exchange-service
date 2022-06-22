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

    let decoded = args[0];
    for (let i = 1; i < args.length; i++) {
        decoded += delimiter;

        if (args[i].length == 64) {
            decoded += Address.fromHex(args[i]).bech32();
        } else if (args[i]) {
            const number = hex2dec(args[i]);
            if (isNumber(number) && !number.toString().includes('e'))
                decoded += number.toString();
            else {
                decoded += hex2ascii(args[i]);
            }
        }
    }

    return decoded;
}

export function encodeTransactionData(data: string): string {
    const delimiter = '@';

    const args = data.split(delimiter);

    let toEncode = args[0];
    for (let i = 1; i < args.length; i++) {
        toEncode += delimiter;

        if (args[i].length == 62) {
            toEncode += Address.fromString(args[i]).hex();
        } else {
            if (isNumber(parseInt(args[i])))
                toEncode += deci2hex(args[i], true);
            else {
                toEncode += ascii2hex(args[i]);
            }
        }
    }

    return base64Encode(toEncode);
}

function hex2ascii(hexx: string): string {
    var hex = hexx.toString();
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
    return str.toString();
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

function hex2dec(hex: string): number {
    return parseInt(hex, 16);
}

function deci2hex(d, toEvenLength = false) {
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
