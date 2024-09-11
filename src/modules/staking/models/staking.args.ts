import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SortingOrder } from 'src/modules/common/page.data';

export enum StakingFarmsSortableFields {
    PRICE = 'price',
    TVL = 'tvl',
    APR = 'apr',
    DEPLOYED_AT = 'deployedAt',
}

registerEnumType(StakingFarmsSortableFields, {
    name: 'StakingFarmsSortableFields',
});

@ArgsType()
export class StakeFarmArgs {
    @Field()
    farmStakeAddress: string;
    @Field(() => [InputTokenModel])
    payments: Array<InputTokenModel>;
}

@ArgsType()
export class GenericStakeFarmArgs {
    @Field()
    farmStakeAddress: string;
    @Field(() => InputTokenModel)
    payment: InputTokenModel;
}

@ArgsType()
export class ClaimRewardsWithNewValueArgs extends GenericStakeFarmArgs {
    @Field()
    newValue: string;
}

@InputType()
export class StakingFarmsFilter {
    @Field(() => String, { nullable: true })
    searchToken?: string;
    @Field({ nullable: true })
    rewardsEnded?: boolean;
}

@InputType()
export class StakingFarmsSortingArgs {
    @Field(() => StakingFarmsSortableFields, { nullable: true })
    sortField?: StakingFarmsSortableFields;

    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder: SortingOrder;
}
