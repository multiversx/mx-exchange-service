import { Field, Int, ObjectType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from '../proxy.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedFarmToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field(type => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
