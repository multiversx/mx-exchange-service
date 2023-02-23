import {
    BaseRewardsEvent,
    RewardsEventV1_2,
    RewardsEventV1_3,
} from '@multiversx/sdk-exchange';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import {
    FarmTokenAttributesModelV1_3,
    FarmTokenAttributesModelV1_2,
} from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class RewardsFarmEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    private oldFarmToken: GenericToken;
    @Field(() => GenericToken)
    private newFarmToken: GenericToken;
    @Field(() => String)
    private farmSupply: BigNumber;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;
    @Field(() => String)
    private rewardTokenReserves: BigNumber;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<BaseRewardsEvent>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class RewardsFarmEventModelV1_2 extends RewardsFarmEventModel {
    @Field(() => FarmTokenAttributesModelV1_2)
    private oldFarmAttributes: FarmTokenAttributesModelV1_2;
    @Field(() => FarmTokenAttributesModelV1_2)
    private newFarmAttributes: FarmTokenAttributesModelV1_2;

    constructor(init?: Partial<RewardsEventV1_2>) {
        super(init);
        Object.assign(this);
    }
}

@ObjectType()
export class RewardsFarmEventModelV1_3 extends RewardsFarmEventModel {
    @Field(() => FarmTokenAttributesModelV1_3)
    private oldFarmAttributes: FarmTokenAttributesModelV1_3;
    @Field(() => FarmTokenAttributesModelV1_3)
    private newFarmAttributes: FarmTokenAttributesModelV1_3;

    constructor(init?: Partial<RewardsEventV1_3>) {
        super(init);
        Object.assign(this);
    }
}
