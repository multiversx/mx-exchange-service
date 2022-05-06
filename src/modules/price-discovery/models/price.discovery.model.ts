import { PriceDiscoveryPhase } from '@elrondnetwork/erdjs-dex';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@ObjectType()
export class PhaseModel {
    @Field()
    name: string;
    @Field()
    penaltyPercent: number;

    constructor(init?: Partial<PriceDiscoveryPhase>) {
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
    redeemToken: NftCollection;
    @Field()
    launchedTokenAmount: string;
    @Field()
    acceptedTokenAmount: string;
    @Field()
    launchedTokenRedeemBalance: string;
    @Field()
    acceptedTokenRedeemBalance: string;
    @Field()
    launchedTokenPrice: string;
    @Field()
    acceptedTokenPrice: string;
    @Field()
    launchedTokenPriceUSD: string;
    @Field()
    acceptedTokenPriceUSD: string;
    @Field()
    startBlock: number;
    @Field()
    endBlock: number;
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
    @Field()
    lockingScAddress: string;
    @Field(() => Int)
    unlockEpoch: number;
    @Field()
    penaltyMinPercentage: number;
    @Field()
    penaltyMaxPercentage: number;
    @Field()
    fixedPenaltyPercentage: number;

    constructor(init?: Partial<PriceDiscoveryModel>) {
        Object.assign(this, init);
    }
}
