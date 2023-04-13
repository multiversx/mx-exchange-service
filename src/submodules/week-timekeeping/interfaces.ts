export interface IWeekTimekeepingAbiService {
    currentWeek(scAddress: string): Promise<number>;
    firstWeekStartEpoch(scAddress: string): Promise<number>;
}

export interface IWeekTimekeepingComputeService {
    weekForEpoch(scAddress: string, epoch: number): Promise<number>;
    startEpochForWeek(scAddress: string, week: number): Promise<number>;
    endEpochForWeek(scAddress: string, week: number): Promise<number>;
    computeWeekForEpoch(scAddress: string, epoch: number): Promise<number>;
    computeStartEpochForWeek(scAddress: string, week: number): Promise<number>;
    computeEndEpochForWeek(scAddress: string, week: number): Promise<number>;
}
