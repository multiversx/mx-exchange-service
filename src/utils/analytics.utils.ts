import { TimeResolution } from "@multiversx/sdk-data-api-client";
import moment from "moment";

export const decodeTime = (time: string): [string, moment.unitOfTime.Base] => {
    const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
    return [timeAmount, timeUnit as moment.unitOfTime.Base];
};

export const computeTimeInterval = (time: string, start?: string): [Date, Date] => {
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

export function FormatDataApiErrors() {
    return (_target: object, _key: string | symbol, descriptor: PropertyDescriptor) => {
        const childMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                return await childMethod.apply(this, args);
            } catch (errors) {
                const errorIds: string[] = errors?.map(error => error?.extensions?.id);
                throw new Error(`Data API Internal Error. Error IDs: ${errorIds.join()}`);
            }
        };
        return descriptor;
    };
}
