import { ArgsType, Field } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

@ArgsType()
export class ProxyStakeFarmArgs {
    @Field()
    proxyStakingAddress: string;
    @Field(() => [InputTokenModel])
    payments: Array<InputTokenModel>;
}

@ArgsType()
export class ClaimDualYieldArgs {
    @Field()
    proxyStakingAddress: string;
    @Field(() => [InputTokenModel])
    payments: Array<InputTokenModel>;
}

@ArgsType()
export class UnstakeFarmTokensArgs {
    @Field()
    proxyStakingAddress: string;
    @Field(() => InputTokenModel)
    payment: InputTokenModel;
    @Field()
    attributes: string;
    @Field()
    tolerance: number;
}
