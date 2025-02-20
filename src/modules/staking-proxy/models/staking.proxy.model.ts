import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { RewardsModel } from 'src/modules/farm/models/farm.model';
import { LiquidityPosition } from 'src/modules/pair/models/pair.model';
import { StakingRewardsModel } from 'src/modules/staking/models/staking.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

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
    @Field({ complexity: nestedFieldComplexity })
    stakingToken: EsdtToken;
    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;
    @Field({ complexity: nestedFieldComplexity })
    dualYieldToken: NftCollection;
    @Field({ complexity: nestedFieldComplexity })
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
