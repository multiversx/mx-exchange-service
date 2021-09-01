import { Address } from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericEventType } from './generic.types';

@ObjectType()
export class GenericEvent {
    @Field(type => String)
    private address = '';
    private identifier = '';
    protected topics = [];
    protected data = '';

    @Field(type => String)
    protected caller: Address;
    @Field(type => Int)
    protected block: BigNumber;
    @Field(type => Int)
    protected epoch: BigNumber;
    @Field(type => Int)
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
