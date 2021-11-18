import { ObjectType, Field } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftToken } from '../../../models/tokens/nftToken.model';
import { FarmTokenAttributesModel } from '../../farm/models/farmTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from '../../proxy/models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from '../../proxy/models/wrappedLpTokenAttributes.model';
import { FarmToken } from '../../../models/tokens/farmToken.model';
import { LockedLpToken } from '../../../models/tokens/lockedLpToken.model';
import { LockedFarmToken } from '../../../models/tokens/lockedFarmToken.model';
import { LockedAssetToken } from '../../../models/tokens/lockedAssetToken.model';
import { LockedAssetAttributes } from '../../locked-asset-factory/models/locked-asset.model';

@ObjectType()
export class UserToken extends EsdtToken {
    @Field() valueUSD: string;
}

@ObjectType()
export class UserNftToken extends NftToken {
    @Field() valueUSD: string;
    @Field() decodedAttributes: string;

    constructor(init?: Partial<UserNftToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedAssetToken extends LockedAssetToken {
    decodedAttributes: LockedAssetAttributes;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedAssetToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserFarmToken extends FarmToken {
    decodedAttributes: FarmTokenAttributesModel;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedLPToken extends LockedLpToken {
    decodedAttributes: WrappedLpTokenAttributesModel;
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedLPToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedFarmToken extends LockedFarmToken {
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
