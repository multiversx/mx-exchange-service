import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { NftToken } from './tokens/nftToken.model';
import { BaseToken } from './interfaces/token.interface';
import { BaseNftToken } from './interfaces/nftToken.interface';
import { FarmToken } from './interfaces/farmToken.interface';
import { LockedLpToken } from './interfaces/lockedLpToken.interface';
import { LockedFarmToken } from './interfaces/lockedFarmToken.interface';
import { FarmTokenAttributesModel } from './farm.model';
import {
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from './proxy.model';

@ObjectType({
    implements: () => [BaseToken],
})
export class UserToken extends EsdtToken implements BaseToken {
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [BaseNftToken],
})
export class UserNftToken extends NftToken implements BaseNftToken {
    @Field(type => Int) decimals: number;
    @Field() valueUSD: string;
    @Field() decodedAttributes: string;
}

@ObjectType({
    implements: () => [FarmToken],
})
export class UserFarmToken extends NftToken implements FarmToken {
    decimals: number;
    decodedAttributes: FarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [LockedLpToken],
})
export class UserLockedLPToken extends NftToken implements LockedLpToken {
    decimals: number;
    decodedAttributes: WrappedLpTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType({
    implements: () => [LockedFarmToken],
})
export class UserLockedFarmToken extends NftToken implements LockedFarmToken {
    decimals: number;
    decodedAttributes: WrappedFarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType()
export class UserModel {
    @Field() address: string;
}
