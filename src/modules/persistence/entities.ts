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
import { Model } from 'mongoose';

export enum TrackedPairFields {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
    state = 'state',
    totalFeePercent = 'totalFeePercent',
    specialFeePercent = 'specialFeePercent',
    lpTokenID = 'lpTokenID',
}

export type PairStateChanges = Partial<Record<TrackedPairFields, any>>;

export enum PersistenceTasks {
    POPULATE_DB = 'populateDb',
    REFRESH_PAIR_RESERVES = 'refreshReserves',
    INDEX_LP_TOKEN = 'indexLpToken',
    REFRESH_ANALYTICS = 'refreshAnalytics',
    POPULATE_FARMS = 'populateFarms',
    REFRESH_FARM = 'refreshFarm',
    REFRESH_FARM_INFO = 'refreshFarmInfo',
    REFRESH_WEEK_TIMEKEEPING = 'refreshWeekTimekeeping',
}

export const PersistenceTaskPriority: Record<PersistenceTasks, number> = {
    populateDb: 0,
    populateFarms: 5,
    refreshFarm: 15,
    refreshFarmInfo: 20,
    refreshReserves: 10,
    indexLpToken: 100,
    refreshWeekTimekeeping: 200,
    refreshAnalytics: 1000,
};

export const PersistenceTasksWithArguments = [
    PersistenceTasks.INDEX_LP_TOKEN,
    PersistenceTasks.REFRESH_FARM,
    PersistenceTasks.REFRESH_FARM_INFO,
];

export class TaskDto {
    @IsNotEmpty()
    @IsEnum(PersistenceTasks)
    name: PersistenceTasks;

    @ValidateIf((o) => PersistenceTasksWithArguments.includes(o.name))
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    args?: string[];

    constructor(init?: Partial<TaskDto>) {
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

export type BulkWriteOperations<T> = Parameters<Model<T>['bulkWrite']>[0];

export const PRICE_UPDATE_EVENT = 'tokensPriceUpdated';

@ObjectType()
export class PriceUpdatesModel {
    @Field(() => [[String, String]])
    updates: [string, string][];

    constructor(init?: Partial<PriceUpdatesModel>) {
        Object.assign(this, init);
    }
}
