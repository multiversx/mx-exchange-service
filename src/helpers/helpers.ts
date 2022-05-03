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
