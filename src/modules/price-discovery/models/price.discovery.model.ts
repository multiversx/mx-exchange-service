import { PhaseType } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import {
    BigUIntType,
    EnumType,
    EnumVariantDefinition,
    FieldDefinition,
} from '@elrondnetwork/erdjs/out';
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

    toJSON(): PhaseType {
        return {
            name: this.name,
            penaltyPercent: this.penaltyPercent,
        };
    }

    static getEnum(): EnumType {
        return new EnumType('Phase', [
            new EnumVariantDefinition('Idle', 0),
            new EnumVariantDefinition('NoPenalty', 1),
            new EnumVariantDefinition('LinearIncreasingPenalty', 2, [
                new FieldDefinition('penaltyPercentage', '', new BigUIntType()),
            ]),
            new EnumVariantDefinition('OnlyWithdrawFixedPenalty', 3, [
                new FieldDefinition('penaltyPercentage', '', new BigUIntType()),
            ]),
            new EnumVariantDefinition('Unbond', 4),
            new EnumVariantDefinition('Redeem', 5),
        ]);
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
