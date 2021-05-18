import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class LockedAssetModel {
    @Field()
    address: string;

    @Field()
    lockedToken: TokenModel;
}
