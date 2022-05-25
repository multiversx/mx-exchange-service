import { Field, ObjectType } from '@nestjs/graphql';
import { FarmProxyTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedSimpleFarmToken extends NftToken {
    @Field(() => FarmProxyTokenAttributesModel)
    decodedAttributes: FarmProxyTokenAttributesModel;
}
