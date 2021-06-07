import { ObjectType, Field } from '@nestjs/graphql';
import { NFTTokenModel } from './nftToken.model';

@ObjectType()
export class LockedAssetModel {
    @Field()
    address: string;

    @Field()
    lockedToken: NFTTokenModel;
}
