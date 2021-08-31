import {
    BigUIntType,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FarmTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    rewardPerShare: string;
    @Field(type => Int)
    originalEnteringEpoch: number;
    @Field(type => Int)
    enteringEpoch: number;
    @Field(type => Int)
    aprMultiplier: number;
    @Field()
    lockedRewards: boolean;
    @Field()
    initialFarmingAmount: string;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<FarmTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toPlainObject() {
        return {
            rewardPerShare: this.rewardPerShare,
            originalEnteringEpoch: this.originalEnteringEpoch,
            enteringEpoch: this.enteringEpoch,
            aprMultiplier: this.aprMultiplier,
            lockedRewards: this.lockedRewards,
            initialFarmingAmount: this.initialFarmingAmount,
            compoundedReward: this.compoundedReward,
            currentFarmAmount: this.currentFarmAmount,
        };
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): FarmTokenAttributesModel {
        return new FarmTokenAttributesModel({
            rewardPerShare: decodedAttributes.rewardPerShare.toString(),
            originalEnteringEpoch: decodedAttributes.originalEnteringEpoch.toNumber(),
            enteringEpoch: decodedAttributes.enteringEpoch.toNumber(),
            aprMultiplier: decodedAttributes.aprMultiplier.toNumber(),
            lockedRewards: decodedAttributes.withLockedRewards,
            initialFarmingAmount: decodedAttributes.initialFarmingAmount.toFixed(),
            compoundedReward: decodedAttributes.compoundedReward.toFixed(),
            currentFarmAmount: decodedAttributes.currentFarmAmount.toFixed(),
        });
    }

    static getStructure(): StructType {
        return new StructType('FarmTokenAttributes', [
            new StructFieldDefinition('rewardPerShare', '', new BigUIntType()),
            new StructFieldDefinition(
                'originalEnteringEpoch',
                '',
                new U64Type(),
            ),
            new StructFieldDefinition('enteringEpoch', '', new U64Type()),
            new StructFieldDefinition('aprMultiplier', '', new U8Type()),
            new StructFieldDefinition(
                'withLockedRewards',
                '',
                new BooleanType(),
            ),
            new StructFieldDefinition(
                'initialFarmingAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'compoundedReward',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'currentFarmAmount',
                '',
                new BigUIntType(),
            ),
        ]);
    }
}
