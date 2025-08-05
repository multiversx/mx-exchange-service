import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateIf,
} from 'class-validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

export class AggregationParamsDto {
    @IsOptional()
    @IsInt()
    @IsValidUnixTime()
    startTimestamp?: number;

    @IsOptional()
    @IsInt()
    @IsValidUnixTime()
    endTimestamp?: number;

    @IsBoolean()
    includeTradeCount = false;

    @IsBoolean()
    includeFees = false;

    @IsBoolean()
    includeRank = false;
}

export class TradingContestLeaderboardDto extends AggregationParamsDto {
    @IsInt()
    @Min(0)
    offset? = 0;

    @IsInt()
    @Min(1)
    @Max(25)
    limit? = 25;
}

export class TradingContestParamsDto extends AggregationParamsDto {
    @ValidateIf((o) => o.secondToken)
    @IsNotEmpty()
    @IsString()
    firstToken?: string;

    @ValidateIf((o) => o.firstToken)
    @IsNotEmpty()
    @IsString()
    secondToken?: string;
}
