import { TimeResolution } from '@multiversx/sdk-data-api-client';
import { DataApiHistoricalResponse } from '@multiversx/sdk-data-api-client/lib/src/responses';
import BigNumber from 'bignumber.js';
import moment from 'moment';

export const decodeTime = (time: string): [string, moment.unitOfTime.Base] => {
    const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
    return [timeAmount, timeUnit as moment.unitOfTime.Base];
};

export const computeTimeInterval = (
    time: string,
    start?: string,
): [Date, Date] => {
    const [timeAmount, timeUnit] = decodeTime(time);

    const startDate1 = moment().utc().subtract(timeAmount, timeUnit);
    const startDate2 = start ? moment.unix(parseInt(start)).utc() : undefined;

    const startDate = startDate2
        ? moment.max(startDate1, startDate2).toDate()
        : startDate1.toDate();
    const endDate = moment().utc().toDate();

    return [startDate, endDate];
};

export const convertBinToTimeResolution = (bin: string): TimeResolution => {
    switch (bin) {
        case '30s':
            return TimeResolution.INTERVAL_30_SECONDS;
        case '30s':
        case '1m':
            return TimeResolution.INTERVAL_1_MINUTE;
        case '10m':
            return TimeResolution.INTERVAL_10_MINUTES;
        case '30m':
            return TimeResolution.INTERVAL_30_MINUTES;
        case '1h':
            return TimeResolution.INTERVAL_HOUR;
        case '24h':
        case '1d':
            return TimeResolution.INTERVAL_DAY;
    }

    throw new Error('Invalid bin');
};

export const generateCacheKeysForTimeInterval = (
    intervalStart: moment.Moment,
    intervalEnd: moment.Moment,
): string[] => {
    const keys = [];
    for (
        let d = intervalStart.clone();
        d.isSameOrBefore(intervalEnd);
        d.add(1, 'day')
    ) {
        keys.push(d.format('YYYY-MM-DD'));
    }

    return keys;
};

export const convertDataApiHistoricalResponseToHash = (
    rows: DataApiHistoricalResponse[],
): { field: string; value: { last: string; sum: string } }[] => {
    const toBeInserted = rows.map((row) => {
        const field = moment.utc(row.timestamp * 1000).format('YYYY-MM-DD');
        const value = {
            last: new BigNumber(row.last ?? '0').toFixed(),
            sum: new BigNumber(row.sum ?? '0').toFixed(),
        };
        return { field, value };
    });
    return toBeInserted;
};

export const computeIntervalValues = (keys, values) => {
    const intervalValues = [];
    for (const [index, key] of keys.entries()) {
        intervalValues.push({
            field: key,
            value: values[index] ? JSON.parse(values[index]) : null,
        });
    }
    return intervalValues;
};
