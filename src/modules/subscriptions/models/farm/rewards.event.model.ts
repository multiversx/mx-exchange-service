import { RewardsEvent } from '@elrondnetwork/erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class RewardsEventModel extends GenericEventModel {
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
    @Field(() => FarmTokenAttributesModel)
    private oldFarmAttributes: FarmTokenAttributesModel;
    @Field(() => FarmTokenAttributesModel)
    private newFarmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<RewardsEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
