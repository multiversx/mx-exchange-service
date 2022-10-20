import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { WeekTimekeepingService } from '../services/week-timekeeping.service';
import { WeekFilterPeriodModel } from '../../weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { UserInputError } from 'apollo-server-express';


@Injectable()
export abstract class AbstractWeekValidation implements PipeTransform {
    abstract address
    constructor(
        private readonly weekTimekeepingService: WeekTimekeepingService,
    ) {
    }
    async transform(weekFilter: WeekFilterPeriodModel | undefined, metadata: ArgumentMetadata): Promise<WeekFilterPeriodModel> {
        const time = await this.weekTimekeepingService.getWeeklyTimekeeping(this.address);
        weekFilter = this.setIfUndefined(weekFilter, time.currentWeek);

        if (weekFilter.start > weekFilter.end) {
            throw new UserInputError(`${metadata.data}.start must be less than or equal to ${metadata.data}.end`);
        }
        if (weekFilter.start <= 0) {
            throw new UserInputError(`${metadata.data}.start must be greater than or equal to zero`);
        }
        if (weekFilter.end <= 0) {
            throw new UserInputError(`${metadata.data}.end must be greater than or equal to zero`);
        }

        if (weekFilter.start > time.currentWeek) {
            throw new UserInputError(`${metadata.data}.start must be less than or equal to the current week`);
        }
        if (weekFilter.end > time.currentWeek) {
            throw new UserInputError(`${metadata.data}.end must be less than or equal to the current week`);
        }
        return weekFilter;
    }

    private setIfUndefined(
        weekFilter: WeekFilterPeriodModel | undefined,
        currentWeek: number): WeekFilterPeriodModel {
        if (weekFilter === undefined) {
            return new WeekFilterPeriodModel({
                start: 1,
                end: currentWeek
            })
        }
        if (weekFilter.start === undefined) {
            return new WeekFilterPeriodModel({
                start: 1,
                end: weekFilter.end ?? currentWeek
            })
        }
        return new WeekFilterPeriodModel({
            start: weekFilter.start,
            end: weekFilter.start
        })
    }

}