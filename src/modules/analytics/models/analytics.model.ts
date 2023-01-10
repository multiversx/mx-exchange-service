import { HistoricalValue } from '@elrondnetwork/erdjs-data-api-client';
import { DataApiHistoricalResponse } from '@elrondnetwork/erdjs-data-api-client/lib/src/responses';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
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
            timestamp: row.timestamp.toString(),
            value: new BigNumber(row[aggregate] ?? '0').toFixed(),
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
