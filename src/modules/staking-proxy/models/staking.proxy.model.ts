import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { RewardsModel } from 'src/modules/farm/models/farm.model';
import { LiquidityPosition } from 'src/modules/pair/models/pair.model';
import { StakingRewardsModel } from 'src/modules/staking/models/staking.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({
    collection: 'staking_proxies',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
@ObjectType()
export class StakingProxyModel {
    @Prop({ unique: true })
    @Field()
    address: string;

    @Prop({ index: true })
    @Field()
    lpFarmAddress: string;

    @Prop({ index: true })
    @Field()
    stakingFarmAddress: string;

    @Prop({ default: 0 })
    @Field(() => Int)
    stakingMinUnboundEpochs: number;

    @Prop({ index: true })
    @Field()
    pairAddress: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    stakingToken: EsdtToken;

    @Prop()
    stakingTokenID: string;

    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;

    @Prop()
    farmTokenCollection: string;

    @Field({ complexity: nestedFieldComplexity })
    dualYieldToken: NftCollection;

    @Prop()
    dualYieldTokenCollection: string;

    @Field({ complexity: nestedFieldComplexity })
    lpFarmToken: NftCollection;

    @Prop()
    lpFarmTokenCollection: string;

    constructor(init?: Partial<StakingProxyModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DualYieldRewardsModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field({ complexity: nestedFieldComplexity })
    stakingRewards: StakingRewardsModel;
    @Field({ complexity: nestedFieldComplexity })
    farmRewards: RewardsModel;

    constructor(init?: Partial<DualYieldRewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UnstakeFarmTokensReceiveModel {
    @Field(() => LiquidityPosition, { complexity: nestedFieldComplexity })
    liquidityPosition: LiquidityPosition;
    @Field()
    farmRewards: string;
    @Field()
    stakingRewards: string;

    constructor(init?: Partial<UnstakeFarmTokensReceiveModel>) {
        Object.assign(this, init);
    }
}
