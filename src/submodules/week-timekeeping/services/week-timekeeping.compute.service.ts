import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WeekTimekeepingGetterService } from './week-timekeeping.getter.service';
import { constantsConfig } from '../../../config';
import { ErrInvalidEpochLowerThanFirstWeekStartEpoch, ErrInvalidWeek } from '../errors';
import { IWeekTimekeepingComputeService } from '../interfaces';

@Injectable()
export class WeekTimekeepingComputeService implements IWeekTimekeepingComputeService {
    epochsInWeek: number;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly configService: ApiConfigService,
        @Inject(forwardRef(() => WeekTimekeepingGetterService))
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
    ) {
        this.epochsInWeek = constantsConfig.EPOCHS_IN_WEEK;
    }

    async computeWeekForEpoch(scAddress: string, epoch: number): Promise<number> {
        const firstWeekStartEpoch = await this.weekTimekeepingGetter.getFirstWeekStartEpoch(scAddress);
        if (epoch < firstWeekStartEpoch) {
            throw ErrInvalidEpochLowerThanFirstWeekStartEpoch
        }

        return Math.floor((epoch - firstWeekStartEpoch) / this.epochsInWeek) + 1;
    }

    async computeStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        const firstWeekStartEpoch = await this.weekTimekeepingGetter.getFirstWeekStartEpoch(scAddress);
        if (week <= 0) {
            throw ErrInvalidWeek
        }

        return firstWeekStartEpoch + (week - 1) * this.epochsInWeek
    }

    async computeEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (week <= 0) {
            throw ErrInvalidWeek
        }

        const startEpochForWeek = await this.computeStartEpochForWeek(scAddress, week)
        return startEpochForWeek + this.epochsInWeek - 1;
    }
}
