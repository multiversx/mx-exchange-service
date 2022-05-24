import { SwapNoFeeEvent } from '@elrondnetwork/erdjs-dex';
import { Address } from '@elrondnetwork/erdjs/out';
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
