import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { WrappedFarmTokenAttributesModel } from '../proxy.model';
import { BaseNftToken } from './nftToken.interface';

@InterfaceType()
export abstract class LockedFarmToken extends BaseNftToken {
    @Field(type => Int) decimals: number;
    @Field(type => WrappedFarmTokenAttributesModel)
    decodedAttributes: WrappedFarmTokenAttributesModel;
}
