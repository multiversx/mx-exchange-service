import { Field, InterfaceType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../farm.model';
import { BaseNftToken } from './nftToken.interface';

@InterfaceType()
export abstract class FarmToken extends BaseNftToken {
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
}
