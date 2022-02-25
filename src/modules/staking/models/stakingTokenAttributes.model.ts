import {
    BigUIntType,
    FieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum StakingTokenType {
    STAKING_FARM_TOKEN = 'stakingFarmToken',
    UNBOUND_FARM_TOKEN = 'unboundFarmToken',
}

registerEnumType(StakingTokenType, { name: 'StakingTokenType' });

@ObjectType()
export class StakingTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field(() => StakingTokenType)
    type = StakingTokenType.STAKING_FARM_TOKEN;
    @Field()
    rewardPerShare: string;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<StakingTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            rewardPerShare: this.rewardPerShare,
            compoundedReward: this.compoundedReward,
            currentFarmAmount: this.currentFarmAmount,
        };
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): StakingTokenAttributesModel {
        return new StakingTokenAttributesModel({
            rewardPerShare: decodedAttributes.rewardPerShare.toFixed(),
            compoundedReward: decodedAttributes.compoundedReward.toFixed(),
            currentFarmAmount: decodedAttributes.currentFarmAmount.toFixed(),
        });
    }

    static getStructure(): StructType {
        return new StructType('StakingFarmTokenAttributes', [
            new FieldDefinition('rewardPerShare', '', new BigUIntType()),
            new FieldDefinition('compoundedReward', '', new BigUIntType()),
            new FieldDefinition('currentFarmAmount', '', new BigUIntType()),
        ]);
    }
}

@ObjectType()
export class UnbondTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field(() => StakingTokenType)
    type = StakingTokenType.UNBOUND_FARM_TOKEN;
    @Field(() => Int)
    remainingEpochs: number;

    constructor(init?: Partial<UnbondTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            type: this.type,
            unlockEpoch: this.remainingEpochs,
        };
    }

    static getStructure(): StructType {
        return new StructType('UnboundFarmTokenAttributes', [
            new FieldDefinition('unlockEpoch', '', new U64Type()),
        ]);
    }
}
