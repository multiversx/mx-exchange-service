import { ArgsType, Field } from '@nestjs/graphql';
import { SCAddressType } from '../models/sc-address.model';

@ArgsType()
export class SCAddressArgs {
    @Field()
    address: string;

    @Field(() => SCAddressType)
    category: SCAddressType;
}
