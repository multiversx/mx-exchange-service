import { Field, InterfaceType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from '../proxy.model';
import { BaseNftToken } from './nftToken.interface';

@InterfaceType()
export abstract class LockedFarmToken extends BaseNftToken {
    @Field(type => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
