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

export enum TRACKED_PAIR_FIELDS {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
    state = 'state',
    totalFeePercent = 'totalFeePercent',
    specialFeePercent = 'specialFeePercent',
    lpTokenID = 'lpTokenID',
}

export type PairStateChanges = Partial<Record<TRACKED_PAIR_FIELDS, any>>;

export enum PersistenceTasks {
    POPULATE_DB = 'populateDb',
    REFRESH_PAIR_RESERVES = 'refreshReserves',
    INDEX_LP_TOKEN = 'indexLpToken',
    REFRESH_ANALYTICS = 'refreshAnalytics',
}

export const TASK_MAX_SCORE = 1000;

export const PersistenceTaskPriority: Record<PersistenceTasks, number> = {
    populateDb: 0,
    refreshReserves: 10,
    indexLpToken: 100,
    refreshAnalytics: TASK_MAX_SCORE,
};

export class TaskDto {
    @IsNotEmpty()
    @IsEnum(PersistenceTasks)
    name: PersistenceTasks;

    @ValidateIf((o) => o.name === PersistenceTasks.INDEX_LP_TOKEN)
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
