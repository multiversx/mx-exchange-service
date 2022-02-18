import {
    BigUIntType,
    FieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DualYieldTokenAttributesModel {
    @Field()
    identifier?: string;
    @Field()
    attributes?: string;
    @Field(() => Int)
    lpFarmTokenNonce: number;
    @Field()
    lpFarmTokenAmount: string;
    @Field(() => Int)
    stakingFarmTokenNonce: number;
    @Field()
    stakingFarmTokenAmount: string;

    constructor(init?: Partial<DualYieldTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toJSON() {
        return {
            lpFarmTokenNonce: this.lpFarmTokenNonce,
            lpFarmTokenAmount: this.lpFarmTokenAmount,
            stakingFarmTokenNonce: this.stakingFarmTokenNonce,
            stakingFarmTokenAmount: this.stakingFarmTokenAmount,
        };
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): DualYieldTokenAttributesModel {
        return new DualYieldTokenAttributesModel({
            lpFarmTokenNonce: decodedAttributes.lpFarmTokenNonce.toNumber(),
            lpFarmTokenAmount: decodedAttributes.lpFarmTokenAmount.toFixed(),
            stakingFarmTokenNonce: decodedAttributes.stakingFarmTokenNonce.toNumber(),
            stakingFarmTokenAmount: decodedAttributes.stakingFarmTokenAmount.toFixed(),
        });
    }

    static getStructure(): StructType {
        return new StructType('DualYieldTokenAttributes', [
            new FieldDefinition('lpFarmTokenNonce', '', new U64Type()),
            new FieldDefinition('lpFarmTokenAmount', '', new BigUIntType()),
            new FieldDefinition('stakingFarmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'stakingFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
        ]);
    }
}
