import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    Min,
    ValidateIf,
} from 'class-validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

export class CreateTradingContestDto {
    @IsNotEmpty()
    name: string;
    @ValidateIf((o) => !o.pairAddresses || o.pairAddresses === 0)
    @IsArray()
    @ArrayMinSize(1)
    tokens?: string[];
    @ValidateIf((o) => !o.tokens || o.tokens.length === 0)
    @IsArray()
    pairAddresses?: string[];
    @IsNotEmpty()
    @IsBoolean()
    requiresRegistration: boolean;
    @IsNotEmpty()
    @IsInt()
    @IsValidUnixTime()
    start: number;
    @IsNotEmpty()
    @IsInt()
    @IsValidUnixTime()
    end: number;
    @IsInt()
    @Min(1)
    minSwapAmountUSD: number;
}
