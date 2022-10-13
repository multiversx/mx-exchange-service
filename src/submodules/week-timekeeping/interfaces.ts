
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