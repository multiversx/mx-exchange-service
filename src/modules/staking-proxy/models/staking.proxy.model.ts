import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { RewardsModel } from 'src/modules/farm/models/farm.model';
import { StakingRewardsModel } from 'src/modules/staking/models/staking.model';

@ObjectType()
export class StakingProxyModel {
    @Field()
    address: string;
    @Field()
    lpFarmAddress: string;
    @Field()
    stakingFarmAddress: string;
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
    @Field()
    stakingRewards: StakingRewardsModel;
    @Field()
    farmRewards: RewardsModel;

    constructor(init?: Partial<DualYieldRewardsModel>) {
        Object.assign(this, init);
    }
}
