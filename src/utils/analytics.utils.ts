import { TimeResolution } from "@elrondnetwork/erdjs-data-api-client";
import moment from "moment";

export const decodeTime = (time: string): [string, moment.unitOfTime.Base] => {
    const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
    return [timeAmount, timeUnit as moment.unitOfTime.Base];
};

export const computeTimeInterval = (time: string, start?: string): [Date, Date] => {
    const [timeAmount, timeUnit] = decodeTime(time);

    const startDate1 = moment().utc().subtract(timeAmount, timeUnit);
    const startDate2 = moment.unix(parseInt(start)).utc();

    const startDate = moment.max(startDate1, startDate2).toDate();
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
