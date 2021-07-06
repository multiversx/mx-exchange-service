import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../farm.model';
import { BaseNftToken } from './nftToken.interface';

@InterfaceType()
export abstract class FarmToken extends BaseNftToken {
    @Field(type => Int) decimals: number;
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
}
