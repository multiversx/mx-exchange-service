import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import {
    PriceCandlesQueryArgs,
    PriceCandlesResolutions,
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

@Injectable()
export class PriceCandlesArgsValidationPipe implements PipeTransform {
    async transform(value: PriceCandlesQueryArgs, metadata: ArgumentMetadata) {
        const { start, end, resolution } = value;

        const startDate = moment.unix(parseInt(start));
        const endDate = moment.unix(parseInt(end));

        if (endDate.isBefore(startDate)) {
            throw new UserInputError(
                'Invalid interval - end date before start date',
            );
        }

        const duration = moment.duration(endDate.diff(startDate));
        const durationInMinutes = duration.asMinutes();

        let maxDuration = 0;
        switch (resolution) {
            case PriceCandlesResolutions.MINUTE_1:
                maxDuration = MaxMinutesPerResolution.MINUTE_1;
                break;
            case PriceCandlesResolutions.MINUTE_5:
                maxDuration = MaxMinutesPerResolution.MINUTE_5;
                break;
            case PriceCandlesResolutions.MINUTE_15:
                maxDuration = MaxMinutesPerResolution.MINUTE_15;
                break;
            case PriceCandlesResolutions.MINUTE_30:
                maxDuration = MaxMinutesPerResolution.MINUTE_30;
                break;
            case PriceCandlesResolutions.HOUR_1:
                maxDuration = MaxMinutesPerResolution.HOUR_1;
                break;
            case PriceCandlesResolutions.HOUR_4:
                maxDuration = MaxMinutesPerResolution.HOUR_4;
                break;
            case PriceCandlesResolutions.DAY_1:
                maxDuration = MaxMinutesPerResolution.DAY_1;
                break;
            case PriceCandlesResolutions.DAY_7:
                maxDuration = MaxMinutesPerResolution.DAY_7;
                break;
            case PriceCandlesResolutions.MONTH_1:
                maxDuration = MaxMinutesPerResolution.MONTH_1;
                break;
            default:
                break;
        }

        if (durationInMinutes > maxDuration) {
            throw new UserInputError(
                'Invalid interval - selected time window is too large',
            );
        }

        return value;
    }
}
