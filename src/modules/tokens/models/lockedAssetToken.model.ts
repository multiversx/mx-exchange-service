import { Field, ObjectType } from '@nestjs/graphql';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedAssetToken extends NftToken {
    @Field(() => LockedAssetAttributesModel)
    decodedAttributes: LockedAssetAttributesModel;
}
