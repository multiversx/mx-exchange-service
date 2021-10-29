import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../../farm/models/farmTokenAttributes.model';

@ObjectType()
export class WrappedFarmTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    farmTokenID: string;
    @Field(() => Int)
    farmTokenNonce: number;
    @Field()
    farmTokenAmount: string;
    @Field()
    farmTokenIdentifier: string;
    @Field(() => FarmTokenAttributesModel)
    farmTokenAttributes: FarmTokenAttributesModel;
    @Field()
    farmingTokenID: string;
    @Field(() => Int)
    farmingTokenNonce: number;
    @Field()
    farmingTokenAmount: string;

    constructor(init?: Partial<WrappedFarmTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toPlainObject() {
        return {
            farmTokenID: this.farmTokenID,
            farmTokenNonce: this.farmTokenNonce,
            farmTokenAmount: this.farmTokenAmount,
            farmingTokenID: this.farmingTokenID,
            farmingTokenNonce: this.farmingTokenNonce,
            farmingTokenAmount: this.farmingTokenAmount,
        };
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): WrappedFarmTokenAttributesModel {
        return new WrappedFarmTokenAttributesModel({
            farmTokenID: decodedAttributes.farmTokenID.toString(),
            farmTokenNonce: decodedAttributes.farmTokenNonce.toNumber(),
            farmTokenAmount: decodedAttributes.farmTokenAmount.toFixed(),
            farmingTokenID: decodedAttributes.farmingTokenID.toString(),
            farmingTokenNonce: decodedAttributes.farmingTokenNonce.toNumber(),
            farmingTokenAmount: decodedAttributes.farmingTokenAmount.toFixed(),
        });
    }

    static getStructure() {
        return new StructType('WrappedFarmTokenAttributes', [
            new StructFieldDefinition(
                'farmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('farmTokenNonce', '', new U64Type()),
            new StructFieldDefinition('farmTokenAmount', '', new BigUIntType()),
            new StructFieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('farmingTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'farmingTokenAmount',
                '',
                new BigUIntType(),
            ),
        ]);
    }
}
