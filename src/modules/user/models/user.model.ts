import { ObjectType, Field } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftToken } from '../../../models/tokens/nftToken.model';
import { FarmToken } from '../../../models/tokens/farmToken.model';
import { LockedLpToken } from '../../../models/tokens/lockedLpToken.model';
import { LockedFarmToken } from '../../../models/tokens/lockedFarmToken.model';
import { LockedAssetToken } from '../../../models/tokens/lockedAssetToken.model';
import { StakeFarmToken } from 'src/models/tokens/stakeFarmToken.model';
import { UnbondFarmToken } from 'src/models/tokens/unbondFarmToken.model';
import { DualYieldToken } from 'src/models/tokens/dualYieldToken.model';
import { LockedEsdtToken } from 'src/models/tokens/lockedEsdtToken.model';
import { LockedSimpleFarmToken } from 'src/models/tokens/lockedSimpleFarmToken.model';
import { LockedSimpleLpToken } from 'src/models/tokens/lockedSimpleLpToken.model';

@ObjectType()
export class UserToken extends EsdtToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserNftToken extends NftToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserNftToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedAssetToken extends LockedAssetToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedAssetToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserFarmToken extends FarmToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedLPToken extends LockedLpToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedLPToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedFarmToken extends LockedFarmToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserStakeFarmToken extends StakeFarmToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserStakeFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserUnbondFarmToken extends UnbondFarmToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserUnbondFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserDualYiledToken extends DualYieldToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserDualYiledToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserRedeemToken extends UserNftToken {
    constructor(init?: Partial<UserRedeemToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedEsdtToken extends LockedEsdtToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedEsdtToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedSimpleLpToken extends LockedSimpleLpToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedSimpleLpToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedSimpleFarmToken extends LockedSimpleFarmToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedSimpleFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserModel {
    @Field() address: string;
}
