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

export const alignTimestampTo4HourInterval = (timestamp: string): string => {
    const momentTimestamp = moment.unix(parseInt(timestamp));

    return momentTimestamp
        .startOf('hour')
        .subtract(momentTimestamp.hours() % 4, 'hours')
        .unix()
        .toString();
};
