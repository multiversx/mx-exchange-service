import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { WrappedLpTokenAttributesModel } from '../proxy.model';
import { BaseNftToken } from './nftToken.interface';

@InterfaceType()
export abstract class LockedLpToken extends BaseNftToken {
    @Field(type => Int) decimals: number;
    @Field(type => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}
