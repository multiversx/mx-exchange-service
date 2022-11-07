import { Field, ObjectType } from '@nestjs/graphql';
import {
    WrappedFarmTokenAttributesModel,
    WrappedFarmTokenAttributesModelV2,
} from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedFarmToken extends NftToken {
    @Field(() => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}

@ObjectType()
export class LockedFarmTokenV2 extends NftToken {
    @Field(() => WrappedFarmTokenAttributesModelV2)
    decodedAttributes: WrappedFarmTokenAttributesModelV2;
}
