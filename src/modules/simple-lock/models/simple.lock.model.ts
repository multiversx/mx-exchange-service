import {
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LockedTokenAttributesModel {
    @Field()
    originalTokenID: string;
    @Field(() => Int)
    originalTokenNonce: number;
    @Field(() => Int)
    unlockEpoch: number;

    constructor(init?: Partial<LockedTokenAttributesModel>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('LockedTokenAttributes', [
            new FieldDefinition(
                'originalTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('originalTokenNonce', '', new U64Type()),
            new FieldDefinition('unlockEpoch', '', new U64Type()),
        ]);
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): LockedTokenAttributesModel {
        return new LockedTokenAttributesModel({
            originalTokenID: decodedAttributes.originalTokenID.toString(),
            originalTokenNonce: decodedAttributes.originalTokenNonce.toNumber(),
            unlockEpoch: decodedAttributes.unlockEpoch.toNumber(),
        });
    }
}

@ObjectType()
export class LpProxyTokenAttributes {
    @Field()
    lpTokenID: string;
    @Field()
    firstTokenID: string;
    @Field(() => Int)
    firstTokenLockedNonce: number;
    @Field()
    secondTokenID: string;
    @Field(() => Int)
    secondTokenLockedNonce: number;

    constructor(init?: Partial<LpProxyTokenAttributes>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('LpProxyTokenAttributes', [
            new FieldDefinition('lpTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('firstTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('firstTokenLockedNonce', '', new U64Type()),
            new FieldDefinition('secondTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('secondTokenLockedNonce', '', new U64Type()),
        ]);
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): LpProxyTokenAttributes {
        return new LpProxyTokenAttributes({
            lpTokenID: decodedAttributes.lpTokenID.toString(),
            firstTokenID: decodedAttributes.firstTokenID.toString(),
            firstTokenLockedNonce: decodedAttributes.firstTokenLockedNonce.toNumber(),
            secondTokenID: decodedAttributes.secondTokenID.toString(),
            secondTokenLockedNonce: decodedAttributes.secondTokenLockedNonce.toNumber(),
        });
    }
}

@ObjectType()
export class SimpleLockModel {
    @Field()
    address: string;
    @Field()
    lockedTokenID: string;
    @Field()
    lpProxyTokenID: string;

    constructor(init?: Partial<SimpleLockModel>) {
        Object.assign(this, init);
    }
}
