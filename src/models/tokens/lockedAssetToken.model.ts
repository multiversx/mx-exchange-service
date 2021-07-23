import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LockedAssetAttributes } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedAssetToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field(type => LockedAssetAttributes)
    decodedAttributes: LockedAssetAttributes;
}
