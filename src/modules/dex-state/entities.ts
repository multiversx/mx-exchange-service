import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
    ValidateIf,
} from 'class-validator';

export enum StateTasks {
    INIT_STATE = 'initState',
    ADD_PAIR = 'addPair',
    REFRESH_PAIR_RESERVES = 'refreshReserves',
    INDEX_LP_TOKEN = 'indexLpToken',
    REFRESH_ANALYTICS = 'refreshAnalytics',
    POPULATE_FARMS = 'populateFarms',
    REFRESH_FARM = 'refreshFarm',
    REFRESH_FARM_INFO = 'refreshFarmInfo',
    REFRESH_WEEK_TIMEKEEPING = 'refreshWeekTimekeeping',
    POPULATE_STAKING_FARMS = 'populateStaking',
    REFRESH_STAKING_FARM = 'refreshStakingFarm',
    REFRESH_STAKING_FARM_INFO = 'refreshStakingFarmInfo',
    POPULATE_STAKING_PROXIES = 'populateStakingProxies',
}

export const StateTaskPriority: Record<StateTasks, number> = {
    initState: 0,
    addPair: 1,
    populateFarms: 5,
    populateStaking: 6,
    populateStakingProxies: 7,
    refreshFarm: 15,
    refreshStakingFarm: 15,
    refreshFarmInfo: 20,
    refreshStakingFarmInfo: 20,
    refreshReserves: 10,
    indexLpToken: 100,
    refreshWeekTimekeeping: 200,
    refreshAnalytics: 1000,
};

export const StateTasksWithArguments = [
    StateTasks.INDEX_LP_TOKEN,
    StateTasks.ADD_PAIR,
    StateTasks.REFRESH_FARM,
    StateTasks.REFRESH_FARM_INFO,
    StateTasks.REFRESH_STAKING_FARM,
    StateTasks.REFRESH_STAKING_FARM_INFO,
];

export class TaskDto {
    @IsNotEmpty()
    @IsEnum(StateTasks)
    name: StateTasks;

    @ValidateIf((o) => StateTasksWithArguments.includes(o.name))
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    args?: string[];

    constructor(init?: Partial<TaskDto>) {
        Object.assign(this, init);
    }
}
