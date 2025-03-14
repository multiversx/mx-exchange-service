import { Injectable, PipeTransform } from '@nestjs/common';
import {
    PriceCandlesQueryArgs,
    PriceCandlesResolutions,
    TokenMiniChartPriceCandlesQueryArgs,
} from '../models/query.args';
import moment from 'moment';
import { UserInputError } from '@nestjs/apollo';

enum MaxMinutesPerResolution {
    MINUTE_1 = 2880, // 2 days
    MINUTE_5 = 4320, // 3 days
    MINUTE_15 = 5760, // 4 days
    MINUTE_30 = 10080, // 7 days
    HOUR_1 = 14400, // 10 days
    HOUR_4 = 21600, // 15 days
    DAY_1 = 43200, // 30 days
    DAY_7 = 172800, // 120 days
    MONTH_1 = 1036800, // 2 years
}

const resolutionToMaxDuration = {
    [PriceCandlesResolutions.MINUTE_1]: MaxMinutesPerResolution.MINUTE_1,
    [PriceCandlesResolutions.MINUTE_5]: MaxMinutesPerResolution.MINUTE_5,
    [PriceCandlesResolutions.MINUTE_15]: MaxMinutesPerResolution.MINUTE_15,
    [PriceCandlesResolutions.MINUTE_30]: MaxMinutesPerResolution.MINUTE_30,
    [PriceCandlesResolutions.HOUR_1]: MaxMinutesPerResolution.HOUR_1,
    [PriceCandlesResolutions.HOUR_4]: MaxMinutesPerResolution.HOUR_4,
    [PriceCandlesResolutions.DAY_1]: MaxMinutesPerResolution.DAY_1,
    [PriceCandlesResolutions.DAY_7]: MaxMinutesPerResolution.DAY_7,
    [PriceCandlesResolutions.MONTH_1]: MaxMinutesPerResolution.MONTH_1,
};

@Injectable()
export class PriceCandlesArgsValidationPipe implements PipeTransform {
    async transform(
        value: PriceCandlesQueryArgs | TokenMiniChartPriceCandlesQueryArgs,
    ) {
        const { start } = value;

        if (!this.isValidTimestamp(start)) {
            throw new UserInputError('Invalid timestamp format for start.');
        }

        const startDate = moment.unix(parseInt(start));
        const maxDuration =
            resolutionToMaxDuration[PriceCandlesResolutions.HOUR_4];
        const endValue =
            value.end || this.computeEndTime(startDate, maxDuration);

        if (!this.isValidTimestamp(endValue)) {
            throw new UserInputError('Invalid timestamp format for end.');
        }

        const endDate = moment.unix(parseInt(endValue));

        if (endDate.isBefore(startDate)) {
            throw new UserInputError(
                'Invalid interval - end date before start date',
            );
        }

        const durationInMinutes = this.computeDurationInMinutes(
            startDate,
            endDate,
        );

        if (durationInMinutes > maxDuration) {
            throw new UserInputError(
                'Invalid interval - selected time window is too large',
            );
        }

        if (value instanceof PriceCandlesQueryArgs && !value.end) {
            value.end = endValue;
        }
        return value;
    }

    private computeEndTime(
        startDate: moment.Moment,
        maxDuration: number,
    ): string {
        const currentTime = moment.utc();

        if (currentTime.isBefore(startDate)) {
            throw new UserInputError(
                'Invalid interval - start date cannot be in the future',
            );
        }

        const durationInMinutes = this.computeDurationInMinutes(
            startDate,
            currentTime,
        );

        if (durationInMinutes > maxDuration) {
            return startDate.add(maxDuration, 'minutes').unix().toString();
        }

        return currentTime.unix().toString();
    }

    private computeDurationInMinutes(
        start: moment.Moment,
        end: moment.Moment,
    ): number {
        const duration = moment.duration(end.diff(start));
        return duration.asMinutes();
    }

    private isValidTimestamp(timestamp: string): boolean {
        try {
            const unixTime = parseInt(timestamp);
            return moment.unix(unixTime).isValid();
        } catch (error) {
            return false;
        }
    }
}
