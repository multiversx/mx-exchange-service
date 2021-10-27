import { Field, ObjectType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from '../../modules/proxy/models/wrappedFarmTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedFarmToken extends NftToken {
    @Field(type => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
