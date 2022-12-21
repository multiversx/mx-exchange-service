import { Field, ObjectType } from '@nestjs/graphql';
import {
    WrappedLpTokenAttributesModel,
    WrappedLpTokenAttributesModelV2,
} from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedLpToken extends NftToken {
    @Field(() => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}

@ObjectType()
export class LockedLpTokenV2 extends NftToken {
    @Field(() => WrappedLpTokenAttributesModelV2)
    decodedAttributes: WrappedLpTokenAttributesModelV2;
}
