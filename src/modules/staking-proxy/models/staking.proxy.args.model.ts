import { ArgsType, Field, InputType } from '@nestjs/graphql';
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

@InputType()
export class StakingProxiesFilter {
    @Field({ nullable: true })
    address: string;
    @Field({ nullable: true })
    pairAddress: string;
    @Field({ nullable: true })
    stakingFarmAddress: string;
    @Field({ nullable: true })
    lpFarmAddress: string;
    @Field(() => String, { nullable: true })
    searchToken?: string;
}
