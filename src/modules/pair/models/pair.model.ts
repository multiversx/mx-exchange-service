import { ObjectType, Field, ArgsType, Int } from '@nestjs/graphql';
import { PaginationArgs } from '../../dex.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from './pair-info.model';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { ComplexityEstimatorArgs } from 'graphql-query-complexity';
import { Prop, raw, Schema } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

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
export class LockedTokensInfo {
    @Field({
        deprecationReason:
            'field is deprecated and will be removed on next release;' +
            'value can be obtained from lockingSC field',
    })
    lockingScAddress: string;
    @Field(() => SimpleLockModel, { complexity: nestedFieldComplexity })
    lockingSC: SimpleLockModel;
    @Field(() => Int)
    unlockEpoch: number;
    @Field(() => Int)
    lockingDeadlineEpoch: number;

    constructor(init?: Partial<LockedTokensInfo>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairCompoundedAPRModel {
    @Field()
    address: string;

    @Field({ nullable: true })
    feesAPR: string;

    @Field({ nullable: true })
    farmBaseAPR: string;

    @Field({ nullable: true })
    farmBoostedAPR: string;

    @Field({ nullable: true })
    dualFarmBaseAPR: string;

    @Field({ nullable: true })
    dualFarmBoostedAPR: string;

    constructor(init?: Partial<PairCompoundedAPRModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairRewardTokensModel {
    @Field()
    address: string;

    @Field(() => [EsdtToken], {
        complexity: (options: ComplexityEstimatorArgs) => {
            return nestedFieldComplexity(options) * 2;
        },
    })
    poolRewards: EsdtToken[];

    @Field({ nullable: true, complexity: nestedFieldComplexity })
    farmReward: NftCollection;

    @Field({ nullable: true, complexity: nestedFieldComplexity })
    dualFarmReward: EsdtToken;

    constructor(init?: Partial<PairRewardTokensModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
@Schema({
    collection: 'pairs',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
export class PairModel {
    @Prop({ unique: true })
    @Field()
    address: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    firstToken: EsdtToken;

    @Prop({ index: true })
    firstTokenId: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    secondToken: EsdtToken;

    @Prop({ index: true })
    secondTokenId: string;

    @Prop({ default: '0' })
    @Field()
    firstTokenPrice: string;

    @Prop({ default: '0' })
    @Field()
    firstTokenPriceUSD: string;

    @Prop({ default: '0' })
    @Field()
    secondTokenPrice: string;

    @Prop({ default: '0' })
    @Field()
    secondTokenPriceUSD: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        default: null,
    })
    @Field({ complexity: nestedFieldComplexity })
    liquidityPoolToken: EsdtToken;

    @Prop({ index: true })
    liquidityPoolTokenId: string;

    @Prop({ default: '0' })
    @Field()
    liquidityPoolTokenPriceUSD: string;

    @Prop({ default: '0' })
    @Field()
    firstTokenLockedValueUSD: string;

    @Prop({ default: '0' })
    @Field()
    secondTokenLockedValueUSD: string;

    @Prop({ default: '0' })
    @Field()
    lockedValueUSD: string;

    @Prop({ default: '0' })
    @Field()
    previous24hLockedValueUSD: string;

    @Prop({ default: '0' })
    @Field()
    firstTokenVolume24h: string;

    @Prop({ default: '0' })
    @Field()
    secondTokenVolume24h: string;

    @Prop({ default: '0' })
    @Field()
    volumeUSD24h: string;

    @Prop({ default: '0' })
    @Field()
    previous24hVolumeUSD: string;

    @Prop({ default: '0' })
    @Field()
    feesUSD24h: string;

    @Prop({ default: '0' })
    @Field()
    previous24hFeesUSD: string;

    @Prop({ default: '0' })
    @Field()
    feesAPR: string;

    @Prop({
        type: raw({
            reserves0: { type: String },
            reserves1: { type: String },
            totalSupply: { type: String },
        }),
        _id: false,
        default: {
            reserves0: '0',
            reserves1: '0',
            totalSupply: '0',
        },
    })
    @Field(() => PairInfoModel, { complexity: nestedFieldComplexity })
    info: PairInfoModel;

    @Prop({ default: 0 })
    @Field()
    totalFeePercent: number;

    @Prop({ default: 0 })
    @Field()
    specialFeePercent: number;

    @Prop({ default: 0 })
    @Field({
        description: 'Percentage of special fees that go to the fees collector',
    })
    feesCollectorCutPercentage: number;

    @Prop({ type: [String], default: [] })
    @Field(() => [String])
    trustedSwapPairs: string[];

    @Prop()
    @Field()
    type: string;

    @Prop({ index: true })
    @Field()
    state: string;

    @Prop({ default: false, index: true })
    @Field()
    feeState: boolean;

    @Field(() => LockedTokensInfo, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    lockedTokensInfo: LockedTokensInfo;

    @Prop({ type: [String], default: [] })
    @Field(() => [String])
    whitelistedManagedAddresses: string[];

    @Prop({ default: '' })
    @Field()
    initialLiquidityAdder: string;

    @Prop(
        raw([
            {
                address: { type: String },
                tokenID: { type: String },
            },
        ]),
    )
    @Field(() => [FeeDestination], { complexity: nestedFieldComplexity })
    feeDestinations: FeeDestination[];

    @Field(() => FeesCollectorModel, {
        nullable: true,
        description: 'Fees collector set for this pair',
        complexity: nestedFieldComplexity,
    })
    feesCollector: FeesCollectorModel;

    @Prop({ default: false, index: true })
    @Field()
    hasFarms: boolean;

    @Prop({ default: false, index: true })
    @Field()
    hasDualFarms: boolean;

    @Prop({ default: 0, index: true })
    @Field(() => Int)
    tradesCount: number;

    @Prop({ default: 0, index: true })
    @Field(() => Int)
    tradesCount24h: number;

    @Prop({ default: null, index: true })
    @Field(() => Int, { nullable: true })
    deployedAt: number;

    @Field(() => PairCompoundedAPRModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    compoundedAPR: PairCompoundedAPRModel;

    @Field(() => PairRewardTokensModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    rewardTokens: PairRewardTokensModel;

    @Prop({ default: null, type: String })
    @Field({ nullable: true })
    farmAddress: string;

    @Prop({ default: null, type: String })
    @Field({ nullable: true })
    stakingProxyAddress: string;

    @Prop({ default: null, type: String })
    stakingFarmAddress: string;

    @Prop({ default: null, type: String })
    feesCollectorAddress: string;

    constructor(init?: Partial<PairModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairTokens {
    @Field()
    firstTokenID: string;

    @Field()
    secondTokenID: string;

    constructor(init?: Partial<PairTokens>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FeeDestination {
    @Field()
    address: string;
    @Field()
    tokenID: string;

    constructor(init?: Partial<FeeDestination>) {
        Object.assign(this, init);
    }
}
