import { Field, Int, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';

export type GenericTokenType = {
    tokenID: string;
    nonce: number;
    amount: string;
};

@ObjectType()
export class GenericToken {
    @Field()
    tokenID: string;
    @Field(type => Int)
    nonce = new BigNumber(0);
    @Field(type => String)
    amount: BigNumber;

    constructor(init?: Partial<GenericToken>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            tokenID: this.tokenID,
            nonce: this.nonce.toNumber(),
            amount: this.amount.toFixed(),
        };
    }
}
