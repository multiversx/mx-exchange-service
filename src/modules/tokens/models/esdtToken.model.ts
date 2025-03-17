import { Field, ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { IEsdtToken } from './esdtToken.interface';
import { RolesModel } from './roles.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

export enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

export class BaseEsdtToken {
    identifier: string;
    decimals: number;

    constructor(init?: Partial<BaseEsdtToken>) {
        Object.assign(this, init);
    }

    static toEsdtToken(baseEsdtToken: BaseEsdtToken): EsdtToken {
        return new EsdtToken(baseEsdtToken);
    }
}

@ObjectType({
    implements: () => [IEsdtToken],
})
export class EsdtToken extends BaseEsdtToken implements IEsdtToken {
    name: string;
    ticker: string;
    owner: string;
    minted?: string;
    burnt?: string;
    initialMinted?: string;
    derivedEGLD: string;
    price?: string;
    previous24hPrice?: string;
    previous7dPrice?: string;
    volumeUSD24h?: string;
    previous24hVolume?: string;
    liquidityUSD?: string;
    swapCount24h?: number;
    previous24hSwapCount?: number;
    trendingScore?: string;
    supply?: string;
    circulatingSupply?: string;
    @Field(() => AssetsModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    assets?: AssetsModel;
    transactions: number;
    accounts: number;
    isPaused: boolean;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    @Field(() => RolesModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    roles?: RolesModel;
    type?: string;
    balance?: string;
    createdAt?: string;

    constructor(init?: Partial<EsdtToken>) {
        super(init);
        Object.assign(this, init);
        if (init.assets) {
            this.assets = new AssetsModel(init.assets);
        }
        if (init.roles) {
            this.roles = new RolesModel(init.roles);
        }
    }
}
