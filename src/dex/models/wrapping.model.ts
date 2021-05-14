import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class WrapModel {
    @Field()
    address: string;
    @Field()
    wrappedToken: TokenModel;
}
