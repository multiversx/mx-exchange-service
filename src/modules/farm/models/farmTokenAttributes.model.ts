import {
    BigUIntType,
    BooleanType,
    FieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FarmVersion } from './farm.model';

@ObjectType()
export class FarmTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field()
    rewardPerShare: string;
    @Field(() => Int)
    originalEnteringEpoch: number;
    @Field(() => Int)
    enteringEpoch: number;
    @Field(() => Int, { nullable: true })
    aprMultiplier: number;
    @Field({ nullable: true })
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
        version: FarmVersion,
    ): FarmTokenAttributesModel {
        return new FarmTokenAttributesModel({
            rewardPerShare: decodedAttributes.rewardPerShare.toString(),
            originalEnteringEpoch: decodedAttributes.originalEnteringEpoch.toNumber(),
            enteringEpoch: decodedAttributes.enteringEpoch.toNumber(),
            aprMultiplier:
                version === FarmVersion.V1_2
                    ? decodedAttributes.aprMultiplier.toNumber()
                    : null,
            lockedRewards:
                version === FarmVersion.V1_2
                    ? decodedAttributes.withLockedRewards
                    : null,
            initialFarmingAmount: decodedAttributes.initialFarmingAmount.toFixed(),
            compoundedReward: decodedAttributes.compoundedReward.toFixed(),
            currentFarmAmount: decodedAttributes.currentFarmAmount.toFixed(),
        });
    }

    static getStructure(version: FarmVersion): StructType {
        const structType = new StructType('FarmTokenAttributes', [
            new FieldDefinition('rewardPerShare', '', new BigUIntType()),
            new FieldDefinition('originalEnteringEpoch', '', new U64Type()),
            new FieldDefinition('enteringEpoch', '', new U64Type()),
            new FieldDefinition('initialFarmingAmount', '', new BigUIntType()),
            new FieldDefinition('compoundedReward', '', new BigUIntType()),
            new FieldDefinition('currentFarmAmount', '', new BigUIntType()),
        ]);
        const structFields = structType.getFieldsDefinitions();
        if (version === FarmVersion.V1_2) {
            structFields.splice(
                3,
                0,
                new FieldDefinition('aprMultiplier', '', new U8Type()),
            );
            structFields.splice(
                4,
                0,
                new FieldDefinition('withLockedRewards', '', new BooleanType()),
            );
        }

        return new StructType('FarmTokenAttributes', structFields);
    }
}
