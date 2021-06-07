import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './esdtToken.model';

@ObjectType()
export class WrapModel {
    @Field()
    address: string;
    @Field()
    wrappedToken: TokenModel;
}
