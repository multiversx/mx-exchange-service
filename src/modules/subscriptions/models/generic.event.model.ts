import { GenericEvent } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Address } from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';

@ObjectType()
export class GenericEventModel {
    @Field(() => String)
    private address: string;
    @Field(() => String)
    protected caller: Address;
    @Field(() => Int)
    protected block: BigNumber;
    @Field(() => Int)
    protected epoch: BigNumber;
    @Field(() => Int)
    protected timestamp: BigNumber;

    constructor(init?: Partial<GenericEvent>) {
        Object.assign(this, init);
    }
}
