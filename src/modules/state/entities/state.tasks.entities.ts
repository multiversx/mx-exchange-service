import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
    ValidateIf,
    ValidateNested,
} from 'class-validator';

export enum StateTasks {
    INIT_STATE = 'initState',
    INDEX_PAIR = 'indexPair',
    REFRESH_ANALYTICS = 'refreshAnalytics',
    UPDATE_SNAPSHOT = 'updateSnapshot',
    REFRESH_PAIR_RESERVES = 'refreshReserves',
    REFRESH_USDC_PRICE = 'refreshUsdcPrice',
    INDEX_LP_TOKEN = 'indexLpToken',
    REFRESH_FARM = 'refreshFarm',
    REFRESH_FARMS = 'refreshAllFarms',
    REFRESH_STAKING_FARM = 'refreshStakingFarm',
    REFRESH_STAKING_FARMS = 'refreshAllStakingFarms',
    REFRESH_FEES_COLLECTOR = 'refreshFeesCollector',
}

export const StateTaskPriority: Record<StateTasks, number> = {
    initState: 0,
    indexPair: 1,
    refreshReserves: 10,
    refreshUsdcPrice: 12,
    refreshAllFarms: 13,
    refreshAllStakingFarms: 13,
    refreshFeesCollector: 13,
    refreshFarm: 15,
    refreshStakingFarm: 15,
    indexLpToken: 100,
    updateSnapshot: 200,
    refreshAnalytics: 1000,
};

export const StateTasksWithArguments = [
    StateTasks.INDEX_LP_TOKEN,
    StateTasks.INDEX_PAIR,
    StateTasks.REFRESH_FARM,
    StateTasks.REFRESH_STAKING_FARM,
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

export const TOKENS_PRICE_UPDATE_EVENT = 'tokensPriceUpdated';

@ObjectType()
export class PriceUpdatesModel {
    @Field(() => [[String, String]])
    updates: [string, string][];

    constructor(init?: Partial<PriceUpdatesModel>) {
        Object.assign(this, init);
    }
}

export class QueueTasksRequest {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(3)
    @ValidateNested({ each: true })
    @Type(() => TaskDto)
    tasks: TaskDto[];
}
