import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

export class CreateTradingContestDto {
    @IsNotEmpty()
    name: string;
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    tokens?: string[];
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pairAddresses?: string[];
    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsString({ each: true })
    tokensPair?: [string, string];
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
