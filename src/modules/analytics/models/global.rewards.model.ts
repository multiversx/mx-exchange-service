import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@ObjectType()
export class FeesCollectorGlobalRewards {
    @Field()
    totalRewardsUSD: string;

    @Field()
    energyRewardsUSD: string;

    @Field()
    totalEnergyAmount: string;

    @Field()
    totalMexAmount: string;

    constructor(init?: Partial<FeesCollectorGlobalRewards>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmsGlobalRewards {
    @Field()
    pairAddress: string;

    @Field(() => EsdtToken, { nullable: true })
    firstToken?: EsdtToken;

    @Field(() => EsdtToken, { nullable: true })
    secondToken?: EsdtToken;

    @Field()
    totalRewardsUSD: string;

    @Field()
    energyRewardsUSD: string;

    @Field()
    totalEnergyAmount: string;

    @Field()
    totalMexAmount: string;

    constructor(init?: Partial<FarmsGlobalRewards>) {
        Object.assign(this, init);
        if (init?.firstToken) {
            this.firstToken = new EsdtToken(init.firstToken);
        }
        if (init?.secondToken) {
            this.secondToken = new EsdtToken(init.secondToken);
        }
    }
}

@ObjectType()
export class StakingGlobalRewards {
    @Field(() => EsdtToken, { nullable: true })
    farmingToken?: EsdtToken;

    @Field()
    totalRewardsUSD: string;

    @Field()
    energyRewardsUSD: string;

    @Field()
    totalEnergyAmount: string;

    @Field()
    totalMexAmount: string;

    constructor(init?: Partial<StakingGlobalRewards>) {
        Object.assign(this, init);
        if (init?.farmingToken) {
            this.farmingToken = new EsdtToken(init.farmingToken);
        }
    }
}

@ObjectType()
export class GlobalRewardsModel {
    @Field(() => FeesCollectorGlobalRewards)
    feesCollectorGlobalRewards: FeesCollectorGlobalRewards;

    @Field(() => [FarmsGlobalRewards])
    farmsGlobalRewards: FarmsGlobalRewards[];

    @Field(() => [StakingGlobalRewards])
    stakingGlobalRewards: StakingGlobalRewards[];

    constructor(init?: Partial<GlobalRewardsModel>) {
        Object.assign(this, init);
        if (init?.feesCollectorGlobalRewards) {
            this.feesCollectorGlobalRewards = new FeesCollectorGlobalRewards(
                init.feesCollectorGlobalRewards,
            );
        }
        if (init?.farmsGlobalRewards) {
            this.farmsGlobalRewards = init.farmsGlobalRewards.map(
                (farm) => new FarmsGlobalRewards(farm),
            );
        }
        if (init?.stakingGlobalRewards) {
            this.stakingGlobalRewards = init.stakingGlobalRewards.map(
                (staking) => new StakingGlobalRewards(staking),
            );
        }
    }
}
