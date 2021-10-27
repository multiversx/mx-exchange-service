import { Field, ObjectType } from '@nestjs/graphql';
import { LockedAssetAttributes } from '../../modules/locked-asset-factory/models/locked-asset.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedAssetToken extends NftToken {
    @Field(type => LockedAssetAttributes)
    decodedAttributes: LockedAssetAttributes;
}
