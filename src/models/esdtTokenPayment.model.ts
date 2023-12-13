import {
    BigUIntType,
    EnumType,
    EnumVariantDefinition,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@multiversx/sdk-core';
import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

@ObjectType('EsdtTokenPayment')
@InputType('EsdtTokenPaymentInput')
export class EsdtTokenPayment {
    @Field(() => Int, { nullable: true })
    tokenType: number;
    @Field()
    tokenID: string;
    @Field(() => Int)
    nonce: number;
    @Field()
    amount: string;

    constructor(init?: Partial<EsdtTokenPayment>) {
        Object.assign(this, init);
    }
}

export class EsdtTokenPaymentStruct {
    tokenType: EsdtTokenType;
    tokenID: string;
    nonce: number;
    amount: string;

    constructor(init?: Partial<EsdtTokenPaymentStruct>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('EsdtTokenPayment', [
            new FieldDefinition('token_type', '', EsdtTokenType.getEnum()),
            new FieldDefinition(
                'token_identifier',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('token_nonce', '', new U64Type()),
            new FieldDefinition('amount', '', new BigUIntType()),
        ]);
    }
}

export class EsdtTokenType {
    name: string;
    discriminant: number;

    static getEnum(): EnumType {
        return new EnumType(EsdtTokenType.name, [
            new EnumVariantDefinition('Fungible', 0),
            new EnumVariantDefinition('NonFungible', 1),
            new EnumVariantDefinition('SemiFungible', 2),
            new EnumVariantDefinition('Meta', 3),
            new EnumVariantDefinition('Invalid', 4),
        ]);
    }
}

export class EgldOrEsdtTokenPayment {
    tokenIdentifier: string;
    nonce: number;
    amount: string;

    constructor(init?: Partial<EgldOrEsdtTokenPayment>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('EgldOrEsdtTokenPayment', [
            new FieldDefinition(
                'token_identifier',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('token_nonce', '', new U64Type()),
            new FieldDefinition('amount', '', new BigUIntType()),
        ]);
    }
}
