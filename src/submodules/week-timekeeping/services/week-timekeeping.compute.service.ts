import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { constantsConfig } from '../../../config';
import {
    ErrInvalidEpochLowerThanFirstWeekStartEpoch,
    ErrInvalidWeek,
} from '../errors';
import { IWeekTimekeepingComputeService } from '../interfaces';

@Injectable()
export class WeekTimekeepingComputeService
    implements IWeekTimekeepingComputeService
{
    epochsInWeek: number;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        this.epochsInWeek = constantsConfig.EPOCHS_IN_WEEK;
    }

    async computeWeekForEpoch(
        epoch: number,
        firstWeekStartEpoch: number,
    ): Promise<number> {
        if (epoch < firstWeekStartEpoch) {
            throw ErrInvalidEpochLowerThanFirstWeekStartEpoch;
        }

        return (
            Math.floor((epoch - firstWeekStartEpoch) / this.epochsInWeek) + 1
        );
    }

    async computeStartEpochForWeek(
        week: number,
        firstWeekStartEpoch: number,
    ): Promise<number> {
        if (week <= 0) {
            throw ErrInvalidWeek;
        }

        return firstWeekStartEpoch + (week - 1) * this.epochsInWeek;
    }

    async computeEndEpochForWeek(
        week: number,
        firstWeekStartEpoch: number,
    ): Promise<number> {
        if (week <= 0) {
            throw ErrInvalidWeek;
        }

        const startEpochForWeek = await this.computeStartEpochForWeek(
            week,
            firstWeekStartEpoch,
        );
        return startEpochForWeek + this.epochsInWeek - 1;
    }
}
