import { bool } from 'aws-sdk/clients/signer';
import { Address } from '@elrondnetwork/erdjs/out';
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

export function oneYear(): number {
    return oneMonth() * 12;
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

export function oneDayAgo(): string {
    return new Date(new Date().getTime() - oneDay() * 1000).toString();
}

export function oneDayAgoUtc(): string {
    return new Date(new Date().getTime() - oneDay() * 1000).toUTCString();
}

export function daysAgoUtc(days: number): string {
    return new Date(
        new Date().getTime() - oneDay() * days * 1000,
    ).toUTCString();
}

export function addTimeToDateUtc(date: string, timeInSeconds: number): string {
    return new Date(
        new Date(date).getTime() + timeInSeconds * 1000,
    ).toUTCString();
}

export function oneMonthAgoUtc(): string {
    return new Date(new Date().getTime() - oneMonth() * 1000).toUTCString();
}

export function nowUtc(): string {
    return new Date().toUTCString();
}

export function toUtc(date: string): string {
    return new Date(date).toUTCString();
}

export function splitDateRangeIntoIntervalsUtc(
    startDate: string,
    endDate: string,
    intervalInSeconds: number,
): string[] {
    let intervals = [startDate];

    if (intervalInSeconds <= 0) {
        return [startDate, endDate];
    }

    while (isDateGreaterOrEqual(endDate, intervals[intervals.length - 1])) {
        const newIntervalEnd = addTimeToDateUtc(
            intervals[intervals.length - 1],
            intervalInSeconds,
        );

        if (isDateGreaterOrEqual(newIntervalEnd, endDate)) {
            intervals.push(endDate);
            return intervals;
        } else {
            intervals.push(newIntervalEnd);
        }
    }

    return intervals;
}

export function isDateGreaterOrEqual(
    firstDate: string,
    secondDate: string,
): bool {
    return new Date(firstDate).getTime() - new Date(secondDate).getTime() >= 0;
}
