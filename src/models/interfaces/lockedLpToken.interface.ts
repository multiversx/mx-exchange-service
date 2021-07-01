import { Field, InterfaceType } from '@nestjs/graphql';
import { WrappedLpTokenAttributesModel } from '../proxy.model';
import { INftToken } from './nftToken.interface';

@InterfaceType()
export abstract class ILockedLpToken extends INftToken {
    @Field(type => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}
