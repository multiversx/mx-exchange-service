import { ObjectType, Field, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from '../../dex.model';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { PairInfoModel } from './pair-info.model';

@ArgsType()
export class GetPairsArgs extends PaginationArgs {}

@ObjectType()
export class LiquidityPosition {
    @Field()
    firstTokenAmount: string;

    @Field()
    secondTokenAmount: string;

    constructor(init?: Partial<LiquidityPosition>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairModel {
    @Field()
    address: string;

    @Field()
    firstToken: EsdtToken;

    @Field()
    secondToken: EsdtToken;

    @Field()
    firstTokenPrice: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPrice: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    liquidityPoolToken: EsdtToken;

    @Field()
    liquidityPoolTokenPriceUSD: string;

    @Field()
    firstTokenLockedValueUSD: string;

    @Field()
    secondTokenLockedValueUSD: string;

    @Field()
    lockedValueUSD: string;

    @Field()
    firstTokenVolume24h: string;

    @Field()
    secondTokenVolume24h: string;

    @Field()
    volumeUSD24h: string;

    @Field()
    feesUSD24h: string;

    @Field()
    feesAPR: string;

    @Field()
    info: PairInfoModel;

    @Field()
    totalFeePercent: number;

    @Field()
    specialFeePercent: number;

    @Field()
    type: string;

    @Field()
    state: string;

    constructor(init?: Partial<PairModel>) {
        Object.assign(this, init);
    }
}
