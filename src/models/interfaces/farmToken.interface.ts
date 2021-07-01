import { Field, InterfaceType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../farm.model';
import { INftToken } from './nftToken.interface';

@InterfaceType()
export abstract class IFarmToken extends INftToken {
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
}
