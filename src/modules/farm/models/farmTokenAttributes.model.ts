import {
    BigUIntType,
    BooleanType,
    StructFieldDefinition,
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
            new StructFieldDefinition('rewardPerShare', '', new BigUIntType()),
            new StructFieldDefinition(
                'originalEnteringEpoch',
                '',
                new U64Type(),
            ),
            new StructFieldDefinition('enteringEpoch', '', new U64Type()),
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
        if (version === FarmVersion.V1_2) {
            structType.fields.splice(
                3,
                0,
                new StructFieldDefinition('aprMultiplier', '', new U8Type()),
            );
            structType.fields.splice(
                4,
                0,
                new StructFieldDefinition(
                    'withLockedRewards',
                    '',
                    new BooleanType(),
                ),
            );
        }

        return structType;
    }
}
