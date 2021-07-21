import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';
import { NftToken } from './tokens/nftToken.model';
import { FarmTokenAttributesModel } from '../modules/farm/models/farm.model';
import {
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../modules/proxy/models/proxy.model';
import { FarmToken } from './tokens/farmToken.model';
import { LockedLpToken } from './tokens/lockedLpToken.model';
import { LockedFarmToken } from './tokens/lockedFarmToken.model';

@ObjectType()
export class UserToken extends EsdtToken {
    @Field() valueUSD: string;
}

@ObjectType()
export class UserNftToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field() valueUSD: string;
    @Field() decodedAttributes: string;
}

@ObjectType()
export class UserFarmToken extends FarmToken {
    decimals: number;
    decodedAttributes: FarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType()
export class UserLockedLPToken extends LockedLpToken {
    decimals: number;
    decodedAttributes: WrappedLpTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType()
export class UserLockedFarmToken extends LockedFarmToken {
    decimals: number;
    decodedAttributes: WrappedFarmTokenAttributesModel;
    @Field() valueUSD: string;
}

@ObjectType()
export class UserModel {
    @Field() address: string;
}
