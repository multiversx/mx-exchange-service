import { PriceDiscoveryPhase } from '@multiversx/sdk-exchange';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

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
    @Field(() => SimpleLockModel)
    lockingSC: SimpleLockModel;
    @Field({
        deprecationReason:
            'field is deprecated and will be removed on next release;' +
            'value can be obtained from lockingSC field',
    })
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
