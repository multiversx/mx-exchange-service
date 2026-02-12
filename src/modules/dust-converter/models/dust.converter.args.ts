import { ArgsType, Field, Float, InputType } from '@nestjs/graphql';

@InputType()
export class DustConvertTokenInput {
    @Field()
    token: string;

    @Field()
    amount: string;
}

@ArgsType()
export class DustConvertArgs {
    @Field(() => [DustConvertTokenInput])
    inputs: DustConvertTokenInput[];

    @Field()
    to: string;

    @Field(() => Float)
    slippage: number;

    @Field({ defaultValue: true })
    dustMode: boolean;
}
