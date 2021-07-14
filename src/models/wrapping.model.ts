import { ObjectType, Field } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';

@ObjectType()
export class WrapModel {
    @Field()
    address: string;
    @Field()
    wrappedToken: EsdtToken;
}
