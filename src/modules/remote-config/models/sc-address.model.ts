import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class SCAddressModel {
    @Field()
    address: string;
    @Field(() => SCAddressType)
    category: SCAddressType;
}

export enum SCAddressType {
    STAKING = 'STAKING',
    STAKING_PROXY = 'STAKING_PROXY',
}
registerEnumType(SCAddressType, { name: 'SCAddressType' });
