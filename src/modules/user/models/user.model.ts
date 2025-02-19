import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { FarmToken } from 'src/modules/tokens/models/farmToken.model';
import {
    LockedLpToken,
    LockedLpTokenV2,
} from 'src/modules/tokens/models/lockedLpToken.model';
import {
    LockedFarmToken,
    LockedFarmTokenV2,
} from 'src/modules/tokens/models/lockedFarmToken.model';
import { LockedAssetToken } from 'src/modules/tokens/models/lockedAssetToken.model';
import { StakeFarmToken } from 'src/modules/tokens/models/stakeFarmToken.model';
import { UnbondFarmToken } from 'src/modules/tokens/models/unbondFarmToken.model';
import { DualYieldToken } from 'src/modules/tokens/models/dualYieldToken.model';
import { LockedEsdtToken } from 'src/modules/tokens/models/lockedEsdtToken.model';
import { LockedSimpleFarmToken } from 'src/modules/tokens/models/lockedSimpleFarmToken.model';
import { LockedSimpleLpToken } from 'src/modules/tokens/models/lockedSimpleLpToken.model';
import { PaginationArgs } from 'src/modules/dex.model';
import { WrappedLockedTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';

export enum ContractType {
    Farm = 'Farm',
    FeesCollector = 'FeesCollector',
    StakingFarm = 'StakingFarm',
}

@ObjectType()
export class UserToken extends EsdtToken {
    @Field() valueUSD: string;
    @Field({ nullable: true }) pairAddress: string;

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
    @Field() pairAddress: string;

    constructor(init?: Partial<UserFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedLPToken extends LockedLpToken {
    @Field() valueUSD: string;
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedLPToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedFarmToken extends LockedFarmToken {
    @Field() valueUSD: string;
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedLPTokenV2 extends LockedLpTokenV2 {
    @Field() valueUSD: string;
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedLPTokenV2>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedFarmTokenV2 extends LockedFarmTokenV2 {
    @Field() valueUSD: string;
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedFarmTokenV2>) {
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
    @Field() pairAddress: string;

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
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedSimpleLpToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedSimpleFarmToken extends LockedSimpleFarmToken {
    @Field() valueUSD: string;
    @Field() pairAddress: string;

    constructor(init?: Partial<UserLockedSimpleFarmToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserLockedTokenEnergy extends LockedEsdtToken {
    @Field() valueUSD: string;

    constructor(init?: Partial<UserLockedTokenEnergy>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserWrappedLockedToken extends UserNftToken {
    @Field() lockedTokenNonce: number;
    @Field(() => WrappedLockedTokenAttributesModel)
    decodedAttributes: WrappedLockedTokenAttributesModel;

    constructor(init?: Partial<UserWrappedLockedToken>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserNftsModel {
    pagination: PaginationArgs;
    @Field() address: string;
    @Field(() => [UserLockedAssetToken])
    userLockedAssetToken: UserLockedAssetToken[];
    @Field(() => [UserFarmToken])
    userFarmToken: UserFarmToken[];
    @Field(() => [UserLockedLPToken])
    userLockedLPToken: UserLockedLPToken[];
    @Field(() => [UserLockedFarmToken])
    userLockedFarmToken: UserLockedFarmToken[];
    @Field(() => [UserLockedLPTokenV2])
    userLockedLpTokenV2: UserLockedLPTokenV2[];
    @Field(() => [UserLockedFarmTokenV2])
    userLockedFarmTokenV2: UserLockedFarmTokenV2[];
    @Field(() => [UserStakeFarmToken])
    userStakeFarmToken: UserStakeFarmToken[];
    @Field(() => [UserUnbondFarmToken])
    userUnbondFarmToken: UserUnbondFarmToken[];
    @Field(() => [UserDualYiledToken])
    userDualYieldToken: UserDualYiledToken[];
    @Field(() => [UserRedeemToken])
    userRedeemToken: UserRedeemToken[];
    @Field(() => [UserLockedEsdtToken])
    userLockedEsdtToken: UserLockedEsdtToken[];
    @Field(() => [UserLockedSimpleLpToken])
    userLockedSimpleLpToken: UserLockedSimpleLpToken[];
    @Field(() => [UserLockedSimpleFarmToken])
    userLockedSimpleFarmToken: UserLockedSimpleFarmToken[];
    @Field(() => [UserLockedTokenEnergy])
    userLockedTokenEnergy: UserLockedTokenEnergy[];
    @Field(() => [UserWrappedLockedToken])
    userWrappedLockedToken: UserWrappedLockedToken[];
    rawNfts?: NftToken[];

    constructor(
        address: string,
        pagination: PaginationArgs,
        nfts?: NftToken[],
    ) {
        this.address = address;
        this.pagination = pagination;
        if (nfts) {
            this.rawNfts = nfts;
        }
    }
}

@ObjectType()
export class OutdatedContract {
    @Field() address: string;
    @Field() type: ContractType;
    @Field() claimProgressOutdated: boolean;
    @Field({ nullable: true }) farmToken: string;

    constructor(init?: Partial<OutdatedContract>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserNegativeEnergyCheck {
    @Field() LKMEX: boolean;
    @Field() XMEX: boolean;
    @Field() lockedLPTokenV1: boolean;
    @Field() lockedLPTokenV2: boolean;
    @Field() lockedFarmTokenV2: boolean;
    @Field() lockedFarmTokenV1: boolean;
    @Field() metabonding: boolean;

    constructor(init?: Partial<UserNegativeEnergyCheck>) {
        Object.assign(this, init);
    }
}
