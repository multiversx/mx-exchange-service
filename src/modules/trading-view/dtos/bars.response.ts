import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';

export const supportedResolutions = [
    '1',
    '5',
    '15',
    '30',
    '60',
    '240',
    '1D',
    '7D',
    '1M',
];

export enum TradingViewResolution {
    MINUTE_1 = '1',
    MINUTE_5 = '5',
    MINUTE_15 = '15',
    MINUTE_30 = '30',
    HOUR_1 = '60',
    HOUR_4 = '240',
    DAY_1 = '1D',
    DAY_7 = '7D',
    MONTH_1 = '1M',
}

export class BarsResponse {
    s: string;
    errmsg?: string;
    t: number[];
    o: number[];
    h: number[];
    l: number[];
    c: number[];
    v?: number[];
    nextTime?: number;

    constructor(init?: Partial<BarsResponse>) {
        Object.assign(this, init);
    }
}

export class BarsQueryArgs {
    @IsNotEmpty()
    symbol: string;
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    from: number;
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    to: number;
    @IsNotEmpty()
    @IsEnum(TradingViewResolution)
    resolution: TradingViewResolution;
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    countback?: number;

    constructor(init?: Partial<BarsQueryArgs>) {
        Object.assign(this, init);
    }
}

export const resolutionMapping: {
    [key in TradingViewResolution]: PriceCandlesResolutions;
} = {
    [TradingViewResolution.MINUTE_1]: PriceCandlesResolutions.MINUTE_1,
    [TradingViewResolution.MINUTE_5]: PriceCandlesResolutions.MINUTE_5,
    [TradingViewResolution.MINUTE_15]: PriceCandlesResolutions.MINUTE_15,
    [TradingViewResolution.MINUTE_30]: PriceCandlesResolutions.MINUTE_30,
    [TradingViewResolution.HOUR_1]: PriceCandlesResolutions.HOUR_1,
    [TradingViewResolution.HOUR_4]: PriceCandlesResolutions.HOUR_4,
    [TradingViewResolution.DAY_1]: PriceCandlesResolutions.DAY_1,
    [TradingViewResolution.DAY_7]: PriceCandlesResolutions.DAY_7,
    [TradingViewResolution.MONTH_1]: PriceCandlesResolutions.MONTH_1,
};
