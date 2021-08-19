import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftToken } from '../../../models/tokens/nftToken.model';
import { FarmTokenAttributesModel } from '../../farm/models/farm.model';
import {
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../../proxy/models/proxy.model';
import { FarmToken } from '../../../models/tokens/farmToken.model';
import { LockedLpToken } from '../../../models/tokens/lockedLpToken.model';
import { LockedFarmToken } from '../../../models/tokens/lockedFarmToken.model';
import { LockedAssetToken } from '../../../models/tokens/lockedAssetToken.model';
import { LockedAssetAttributes } from '../../../modules/locked-asset-factory/models/locked-asset.model';

@ObjectType()
export class UserToken extends EsdtToken {
    @Field() valueUSD: string;
}

@ObjectType()
export class UserNftToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field() valueUSD: string;
    @Field() decodedAttributes: string;

    constructor(init?: Partial<UserNftToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedAssetToken extends LockedAssetToken {
    decimals: number;
    decodedAttributes: LockedAssetAttributes;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedAssetToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserFarmToken extends FarmToken {
    decimals: number;
    decodedAttributes: FarmTokenAttributesModel;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedLPToken extends LockedLpToken {
    decimals: number;
    decodedAttributes: WrappedLpTokenAttributesModel;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedLPToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedFarmToken extends LockedFarmToken {
    decimals: number;
    decodedAttributes: WrappedFarmTokenAttributesModel;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserModel {
    @Field() address: string;
}
