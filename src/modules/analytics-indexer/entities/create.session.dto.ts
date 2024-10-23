import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsPositive,
} from 'class-validator';
import { IndexerEventTypes } from './indexer.event.types';

export class CreateSessionDto {
    @IsInt()
    @IsPositive()
    start: number;
    @IsOptional()
    @IsInt()
    @IsPositive()
    end?: number;
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsEnum(IndexerEventTypes, { each: true })
    eventTypes: IndexerEventTypes[];
}
