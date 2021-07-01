import { ObjectType, Field } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { NftToken } from './tokens/nftToken.model';
import { IToken } from './interfaces/token.interface';
import { INftToken } from './interfaces/nftToken.interface';
import { IFarmToken } from './interfaces/farmToken.interface';
import { ILockedLpToken } from './interfaces/lockedLpToken.interface';
import { ILockedFarmToken } from './interfaces/lockedFarmToken.interface';
import { FarmTokenAttributesModel } from './farm.model';
import {
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from './proxy.model';

@ObjectType({
    implements: () => [IToken],
})
export class UserToken extends EsdtToken implements IToken {
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [INftToken],
})
export class UserNftToken extends NftToken implements INftToken {
    @Field() valueUSD: string;
    @Field() decodedAttributes: string;
}

@ObjectType({
    implements: () => [IFarmToken],
})
export class UserFarmToken extends NftToken implements IFarmToken {
    decodedAttributes: FarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [ILockedLpToken],
})
export class UserLockedLPToken extends NftToken implements ILockedLpToken {
    decodedAttributes: WrappedLpTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [ILockedFarmToken],
})
export class UserLockedFarmToken extends NftToken implements ILockedFarmToken {
    decodedAttributes: WrappedFarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType()
export class UserModel {
    @Field() address: string;
}
