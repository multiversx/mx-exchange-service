import { WeekForEpochModel, WeekTimekeepingModel } from './models/week-timekeeping.model';

export interface IWeekTimekeepingAbiService {
    getCurrentWeek(scAddress: string): Promise<number>
    firstWeekStartEpoch(scAddress: string): Promise<number>
}

export interface IWeekTimekeepingGetterService {
    getCurrentWeek(scAddress: string): Promise<number>;
    getFirstWeekStartEpoch(scAddress: string): Promise<number>;
    getStartEpochForWeek(scAddress: string, week: number): Promise<number>;
    getEndEpochForWeek(scAddress: string, week: number): Promise<number>;
}

export interface IWeekTimekeepingComputeService {
    computeWeekForEpoch(scAddress: string, epoch: number): Promise<number>;
    computeStartEpochForWeek(scAddress: string, week: number): Promise<number>;
    computeEndEpochForWeek(scAddress: string, week: number): Promise<number>;
}

export interface IWeekTimekeepingService {
    getWeeklyTimekeeping(scAddress: string): Promise<WeekTimekeepingModel>;
    getWeekForEpoch(scAddress: string, epoch: number): Promise<WeekForEpochModel>;
}
