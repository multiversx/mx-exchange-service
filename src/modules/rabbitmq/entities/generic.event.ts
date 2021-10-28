import { Address } from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericEventType } from './generic.types';

@ObjectType()
export class GenericEvent {
    @Field(() => String)
    private address = '';
    private identifier = '';
    protected topics = [];
    protected data = '';

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

    getAddress(): string {
        return this.address;
    }

    getIdentifier(): string {
        return this.identifier;
    }

    getTimestamp(): BigNumber {
        return this.timestamp;
    }

    toJSON(): GenericEventType {
        return {
            address: this.address,
            caller: this.caller.toString(),
            block: this.block.toNumber(),
            epoch: this.epoch.toNumber(),
            timestamp: this.timestamp.toNumber(),
        };
    }
}
