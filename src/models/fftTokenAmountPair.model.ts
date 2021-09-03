import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';

export type FftTokenAmountPairType = {
    tokenID: string;
    amount: string;
};

@ObjectType()
export class FftTokenAmountPair {
    @Field()
    tokenID: string;
    @Field(type => String)
    amount: BigNumber;

    constructor(init?: Partial<FftTokenAmountPair>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            tokenID: this.tokenID,
            amount: this.amount.toFixed(),
        };
    }

    static fromDecodedAttributes(decodedAttributes: any) {
        return new FftTokenAmountPair({
            tokenID: decodedAttributes.tokenID.toString(),
            amount: decodedAttributes.amount,
        });
    }

    static getStructure() {
        return new StructType('FftTokenAmountPair', [
            new StructFieldDefinition('tokenID', '', new TokenIdentifierType()),
            new StructFieldDefinition('amount', '', new BigUIntType()),
        ]);
    }
}
