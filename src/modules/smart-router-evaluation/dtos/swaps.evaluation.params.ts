import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

export class SwapsEvaluationParams {
    @IsInt()
    @Min(0)
    offset: number;
    @IsIn([5, 10, 50, 100, 200, 500, 1000])
    size: number;
    @IsNumber()
    delta: number;
    @IsIn(['lt', 'gt', 'eq'])
    deltaComparison: 'lt' | 'gt' | 'eq';
    @IsOptional()
    @IsInt()
    @IsValidUnixTime()
    start?: number;
    @IsOptional()
    @IsInt()
    @IsValidUnixTime()
    end?: number;
    @IsOptional()
    tokenIn?: string;
    @IsOptional()
    tokenOut?: string;
}
