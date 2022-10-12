import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { WeekTimekeepingService } from '../services/week-timekeeping.service';
import { WeekFilterPeriodModel } from '../../weekly-rewards-splitting/models/weekly-rewards-splitting.model';


@Injectable()
export abstract class AbstractWeekValidation implements PipeTransform {
    abstract address
    constructor(
        private readonly weekTimekeepingService: WeekTimekeepingService,
    ) {
    }
    async transform(weekFilter: WeekFilterPeriodModel, metadata: ArgumentMetadata): Promise<WeekFilterPeriodModel> {
        if (weekFilter.start <= 0) {
            throw new Error(`${metadata.data} must be greater than or equal to zero`);
        }
        const time = await this.weekTimekeepingService.getWeeklyTimekeeping(this.address);
        if (weekFilter.start > time.currentWeek) {
            throw new Error(`${metadata.data} must be less than or equal to the current week`);
        }
        return weekFilter;
    }
}