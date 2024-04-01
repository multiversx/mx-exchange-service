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

    @Field()
    series: string;

    @Field()
    key: EsdtToken;

    @Field()
    open: EsdtToken;

    @Field()
    low: string;

    @Field()
    high: string;

    @Field()
    close: string;

    constructor(init?: Partial<CandleDataModel>) {
      Object.assign(this, init);
  }
}


@ObjectType()
export class PairCandleModel {
    @Field()
    time: string;

    @Field()
    address: string;

    @Field()
    firstToken: EsdtToken;

    @Field()
    secondToken: EsdtToken;

    @Field()
    firstTokenOpen: string;

    @Field()
    firstTokenClose: string;

    @Field()
    firstTokenLow: string;

    @Field()
    firstTokenHigh: string;

    @Field()
    secondTokenOpen: string;

    @Field()
    secondTokenClose: string;

    @Field()
    secondTokenLow: string;

    @Field()
    secondTokenHigh: string;

    constructor(init?: Partial<PairCandleModel>) {
      Object.assign(this, init);
  }
}
