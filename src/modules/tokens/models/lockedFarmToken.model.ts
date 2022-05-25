import { Field, ObjectType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedFarmToken extends NftToken {
    @Field(() => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
