import { Field, InterfaceType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from '../proxy.model';
import { INftToken } from './nftToken.interface';

@InterfaceType()
export abstract class ILockedFarmToken extends INftToken {
    @Field(type => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
