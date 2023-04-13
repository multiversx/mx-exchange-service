import { IWeekTimekeepingAbiService } from '../interfaces';
import { WeekTimekeepingAbiService } from '../services/week-timekeeping.abi.service';

export class WeekTimekeepingAbiServiceMock
    implements IWeekTimekeepingAbiService
{
    async currentWeek(scAddress: string): Promise<number> {
        return 250;
    }
    async firstWeekStartEpoch(scAddress: string): Promise<number> {
        return 250;
    }
}

export const WeekTimekeepingAbiServiceProvider = {
    provide: WeekTimekeepingAbiService,
    useClass: WeekTimekeepingAbiServiceMock,
};
