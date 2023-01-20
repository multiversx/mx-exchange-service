import {
    BaseFarmEvent,
    EnterFarmEventV1_2,
    EnterFarmEventV1_3,
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
export class FarmEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    private farmingToken: GenericToken;
    @Field(() => String)
    private farmingReserve: BigNumber;
    @Field(() => GenericToken)
    private farmToken: GenericToken;
    @Field(() => String)
    private farmSupply: BigNumber;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;
    @Field(() => String)
    private rewardTokenReserves: BigNumber;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<BaseFarmEvent>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmEventModelV1_2 extends FarmEventModel {
    @Field(() => FarmTokenAttributesModelV1_2)
    private farmAttributes: FarmTokenAttributesModelV1_2;

    constructor(init?: Partial<EnterFarmEventV1_2>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmEventModelV1_3 extends FarmEventModel {
    @Field(() => FarmTokenAttributesModelV1_3)
    private farmAttributes: FarmTokenAttributesModelV1_3;

    constructor(init?: Partial<EnterFarmEventV1_3>) {
        super(init);
        Object.assign(this, init);
    }
}
