import {
    EnumType,
    EnumVariantDefinition,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

export enum FarmType {
    SIMPLE_FARM,
    FARM_WITH_LOCKED_REWARDS,
}

registerEnumType(FarmType, { name: 'FarmType' });

export const FarmTypeEnumType = new EnumType('FarmType', [
    new EnumVariantDefinition('SimpleFarm', 0),
    new EnumVariantDefinition('FarmWithLockedRewards', 1),
]);

@ObjectType()
export class LockedTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
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
export class LpProxyTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
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

    constructor(init?: Partial<LpProxyTokenAttributesModel>) {
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
    ): LpProxyTokenAttributesModel {
        return new LpProxyTokenAttributesModel({
            lpTokenID: decodedAttributes.lpTokenID.toString(),
            firstTokenID: decodedAttributes.firstTokenID.toString(),
            firstTokenLockedNonce: decodedAttributes.firstTokenLockedNonce.toNumber(),
            secondTokenID: decodedAttributes.secondTokenID.toString(),
            secondTokenLockedNonce: decodedAttributes.secondTokenLockedNonce.toNumber(),
        });
    }
}

@ObjectType()
export class FarmProxyTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    farmType: string;
    @Field()
    farmTokenID: string;
    @Field(() => Int)
    farmTokenNonce: number;
    @Field()
    farmingTokenID: string;
    @Field(() => Int)
    farmingTokenLockedNonce: number;

    constructor(init?: Partial<FarmProxyTokenAttributesModel>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('FarmProxyTokenAttributes', [
            new FieldDefinition(
                'farmType',
                '',
                new EnumType('FarmType', [
                    new EnumVariantDefinition('SimpleFarm', 0),
                    new EnumVariantDefinition('FarmWithLockedRewards', 1),
                ]),
            ),
            new FieldDefinition('farmTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('farmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('farmingTokenLockedNonce', '', new U64Type()),
        ]);
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): FarmProxyTokenAttributesModel {
        return new FarmProxyTokenAttributesModel({
            farmType: decodedAttributes.farmType.name,
            farmTokenID: decodedAttributes.farmTokenID.toString(),
            farmTokenNonce: decodedAttributes.farmTokenNonce.toNumber(),
            farmingTokenID: decodedAttributes.farmingTokenID.toString(),
            farmingTokenLockedNonce: decodedAttributes.farmingTokenLockedNonce.toNumber(),
        });
    }
}

@ObjectType()
export class SimpleLockModel {
    @Field()
    address: string;
    @Field()
    lockedToken: NftCollection;
    @Field()
    lpProxyToken: NftCollection;
    @Field()
    farmProxyToken: NftCollection;

    constructor(init?: Partial<SimpleLockModel>) {
        Object.assign(this, init);
    }
}
