import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './esdtToken.model';
import { NFTTokenModel } from './nftToken.model';

@ObjectType()
export class UserTokenModel extends TokenModel {
    @Field() value: string;
}

@ObjectType()
export class UserNFTTokenModel extends NFTTokenModel {
    @Field() value: string;
}

@ObjectType()
export class UserModel {
    @Field() address: string;
    @Field(type => [UserTokenModel]) tokens: UserTokenModel[];
    @Field(type => [UserNFTTokenModel]) nfts: UserNFTTokenModel[];
}
