import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DualYieldTokenAttributesModel {
    @Field()
    identifier?: string;
    @Field()
    attributes?: string;
    @Field(() => Int)
    lpFarmTokenNonce: number;
    @Field()
    lpFarmTokenAmount: string;
    @Field(() => Int)
    stakingFarmTokenNonce: number;
    @Field()
    stakingFarmTokenAmount: string;

    constructor(init?: Partial<DualYieldTokenAttributesModel>) {
        Object.assign(this, init);
    }
}
