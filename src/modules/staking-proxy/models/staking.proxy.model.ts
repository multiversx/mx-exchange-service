import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { RewardsModel } from 'src/modules/farm/models/farm.model';
import { LiquidityPosition } from 'src/modules/pair/models/pair.model';
import { StakingRewardsModel } from 'src/modules/staking/models/staking.model';

@ObjectType()
export class StakingProxyModel {
    @Field()
    address: string;
    @Field()
    lpFarmAddress: string;
    @Field()
    stakingFarmAddress: string;
    @Field(() => Int)
    stakingMinUnboundEpochs: number;
    @Field()
    pairAddress: string;
    @Field()
    stakingToken: EsdtToken;
    @Field()
    farmToken: NftCollection;
    @Field()
    dualYieldToken: NftCollection;
    @Field()
    lpFarmToken: NftCollection;

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
    @Field()
    stakingRewards: StakingRewardsModel;
    @Field()
    farmRewards: RewardsModel;

    constructor(init?: Partial<DualYieldRewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UnstakeFarmTokensReceiveModel {
    @Field(() => LiquidityPosition)
    liquidityPosition: LiquidityPosition;
    @Field()
    farmRewards: string;
    @Field()
    stakingRewards: string;

    constructor(init?: Partial<UnstakeFarmTokensReceiveModel>) {
        Object.assign(this, init);
    }
}
