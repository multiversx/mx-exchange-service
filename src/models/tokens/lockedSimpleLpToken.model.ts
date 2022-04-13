import { Field, ObjectType } from '@nestjs/graphql';
import { LpProxyTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedSimpleLpToken extends NftToken {
    @Field(() => LpProxyTokenAttributesModel)
    decodedAttributes: LpProxyTokenAttributesModel;
}
