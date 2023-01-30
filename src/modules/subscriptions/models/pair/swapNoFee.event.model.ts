import { SwapNoFeeEvent } from '@multiversx/sdk-exchange';
import { Address } from '@multiversx/sdk-core';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class SwapNoFeeEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    private tokenIn: GenericToken;
    @Field(() => GenericToken)
    private tokenOut: GenericToken;
    @Field(() => String)
    private destination: Address;

    constructor(init?: Partial<SwapNoFeeEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
