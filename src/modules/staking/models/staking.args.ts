import { ArgsType, Field } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

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
