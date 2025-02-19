import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@ObjectType()
export class HistoricDataModel {
    @Field()
    timestamp: string;
    @Field()
    value: string;

    constructor(init?: Partial<HistoricDataModel>) {
        Object.assign(this, init);
    }

    static fromCompleteValues({ field, value }, type: 'last' | 'sum') {
        return new HistoricDataModel({
            timestamp: moment.utc(field).format('yyyy-MM-DD HH:mm:ss'),
            value: value ? new BigNumber(value[type] ?? '0').toFixed() : '0',
        });
    }
}

@ObjectType()
export class PairDayDataModel {
    @Field()
    timestamp: string;

    @Field()
    address: string;

    @Field()
    firstToken: EsdtToken;

    @Field()
    secondToken: EsdtToken;

    @Field()
    lockedValueUSD: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    volumeUSD24h: string;

    @Field()
    feesUSD24h: string;

    constructor(init?: Partial<PairDayDataModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class CandleDataModel {
    @Field()
    time: string;

    @Field(() => [Number])
    ohlc: number[];

    constructor(init?: Partial<CandleDataModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class OhlcvDataModel {
    @Field()
    time: string;

    @Field(() => [Number])
    ohlcv: number[];

    constructor(init?: Partial<OhlcvDataModel>) {
        Object.assign(this, init);
    }
}
