import { HistoricalValue } from '@multiversx/sdk-data-api-client';
import { DataApiHistoricalResponse } from '@multiversx/sdk-data-api-client/lib/src/responses';
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

    static fromDataApiResponse(row: DataApiHistoricalResponse, aggregate: HistoricalValue) {
        return new HistoricDataModel({
            timestamp: moment.utc(row.timestamp * 1000).format('yyyy-MM-DD HH:mm:ss'),
            value: new BigNumber(row[aggregate] ?? '0').toFixed(),
        });
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
