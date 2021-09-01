import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';

export type GenericTokenAmountPairType = {
    tokenID: string;
    tokenNonce: number;
    amount: string;
};

@ObjectType()
export class GenericTokenAmountPair {
    @Field()
    tokenID: string;
    @Field(type => Int)
    tokenNonce: BigNumber;
    @Field(type => String)
    amount: BigNumber;

    constructor(init?: Partial<GenericTokenAmountPair>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            tokenID: this.tokenID,
            tokenNonce: this.tokenNonce.toNumber(),
            amount: this.amount.toFixed(),
        };
    }

    static fromDecodedAttributes(decodedAttributes: any) {
        return new GenericTokenAmountPair({
            tokenID: decodedAttributes.tokenID.toString(),
            tokenNonce: decodedAttributes.tokenNonce,
            amount: decodedAttributes.amount,
        });
    }

    static getStructure() {
        return new StructType('GenericTokenAmountPair', [
            new StructFieldDefinition('tokenID', '', new TokenIdentifierType()),
            new StructFieldDefinition('tokenNonce', '', new U64Type()),
            new StructFieldDefinition('amount', '', new BigUIntType()),
        ]);
    }
}
