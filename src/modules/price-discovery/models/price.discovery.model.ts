import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@ObjectType()
export class PhaseModel {
    @Field()
    name: string;
    @Field()
    penaltyPercent: number;

    constructor(init?: Partial<PhaseModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PriceDiscoveryModel {
    @Field()
    address: string;
    @Field()
    launchedToken: EsdtToken;
    @Field()
    acceptedToken: EsdtToken;
    @Field()
    rewardsToken: EsdtToken;
    @Field()
    redeemToken: NftCollection;
    @Field({ nullable: true })
    lpToken: EsdtToken;
    @Field()
    launchedTokenAmount: string;
    @Field()
    acceptedTokenAmount: string;
    @Field()
    lpTokensReceived: string;
    @Field()
    extraRewards: string;
    @Field()
    startBlock: number;
    @Field()
    endBlock: number;
    @Field()
    pairAddress: string;
    @Field()
    currentPhase: PhaseModel;
    @Field()
    minLaunchedTokenPrice: string;
    @Field(() => Int)
    noLimitPhaseDurationBlocks: number;
    @Field(() => Int)
    linearPenaltyPhaseDurationBlocks: number;
    @Field(() => Int)
    fixedPenaltyPhaseDurationBlocks: number;
    @Field(() => Int)
    unbondPeriodEpochs: number;
    @Field()
    penaltyMinPercentage: string;
    @Field()
    penaltyMaxPercentage: string;
    @Field()
    fixedPenaltyPercentage: string;

    constructor(init?: Partial<PriceDiscoveryModel>) {
        Object.assign(this, init);
    }
}
