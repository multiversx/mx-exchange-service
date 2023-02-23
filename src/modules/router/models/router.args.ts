import { EnumType, EnumVariantDefinition } from '@multiversx/sdk-core';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';

@InputType()
export class SetLocalRoleOwnerArgs {
    @Field()
    tokenID: string;

    @Field()
    address: string;

    @Field(() => [EsdtLocalRole])
    roles: EsdtLocalRole[];
}

export enum EsdtLocalRole {
    None,
    Mint,
    Burn,
    NftCreate,
    NftAddQuantity,
    NftBurn,
}
registerEnumType(EsdtLocalRole, { name: 'EsdtLocalRole' });
export const EsdtLocalRoleEnumType = new EnumType('EsdtLocalRole', [
    new EnumVariantDefinition('None', 0),
    new EnumVariantDefinition('Mint', 1),
    new EnumVariantDefinition('Burn', 2),
    new EnumVariantDefinition('NftCreate', 3),
    new EnumVariantDefinition('NftAddQuantity', 4),
    new EnumVariantDefinition('NftBurn', 5),
]);
