import { EnterFarmEvent } from '@elrondnetwork/erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class EnterFarmEventModel extends GenericEventModel {
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
    @Field(() => FarmTokenAttributesModel)
    private farmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<EnterFarmEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
