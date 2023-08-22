import { IWeekTimekeepingAbiService } from '../interfaces';
import { WeekTimekeepingAbiService } from '../services/week-timekeeping.abi.service';

export class WeekTimekeepingAbiServiceMock
    implements IWeekTimekeepingAbiService
{
    async currentWeek(): Promise<number> {
        return 250;
    }
    async firstWeekStartEpoch(): Promise<number> {
        return 250;
    }
}

export const WeekTimekeepingAbiServiceProvider = {
    provide: WeekTimekeepingAbiService,
    useClass: WeekTimekeepingAbiServiceMock,
};
