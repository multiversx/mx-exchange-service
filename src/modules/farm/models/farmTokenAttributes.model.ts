import { createUnionType, Field, Int, ObjectType } from '@nestjs/graphql';

export const FarmTokenAttributesUnion = createUnionType({
    name: 'FarmTokenAttributes',
    types: () =>
        [
            FarmTokenAttributesModelV1_2,
            FarmTokenAttributesModelV1_3,
            FarmTokenAttributesModelV2,
        ] as const,
    resolveType(value) {
        switch (value.constructor.name) {
            case FarmTokenAttributesModelV1_2.name:
                return FarmTokenAttributesModelV1_2.name;
            case FarmTokenAttributesModelV1_3.name:
                return FarmTokenAttributesModelV1_3.name;
            case FarmTokenAttributesModelV2.name:
                return FarmTokenAttributesModelV2.name;
        }
    },
});

@ObjectType()
export class FarmTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field()
    rewardPerShare: string;
    @Field(() => Int)
    enteringEpoch: number;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<FarmTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmTokenAttributesModelV1_3 extends FarmTokenAttributesModel {
    @Field(() => Int)
    originalEnteringEpoch: number;
    @Field()
    initialFarmingAmount: string;

    constructor(init?: Partial<FarmTokenAttributesModelV1_3>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmTokenAttributesModelV1_2 extends FarmTokenAttributesModelV1_3 {
    @Field(() => Int, { nullable: true })
    aprMultiplier: number;
    @Field({ nullable: true })
    lockedRewards: boolean;

    constructor(init?: Partial<FarmTokenAttributesModelV1_2>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmTokenAttributesModelV2 extends FarmTokenAttributesModel {}
