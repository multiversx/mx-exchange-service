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
    @Field()
    derivedEGLD: string;
    price?: string;
    @Field()
    previous24hPrice?: string;
    @Field()
    previous7dPrice?: string;
    @Field()
    volumeUSD24h?: string;
    @Field()
    previous24hVolume?: string;
    @Field()
    liquidityUSD?: string;
    @Field()
    swapCount24h?: number;
    @Field()
    previous24hSwapCount?: number;
    @Field()
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
    @Field(() => [RolesModel], {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    roles?: RolesModel[];
    type?: string;
    balance?: string;
    @Field()
    createdAt?: string;
    pairAddress?: string;
    priceChange24h?: number;
    priceChange7d?: number;
    tradeChange24h?: number;
    volumeUSDChange24h?: number;

    constructor(init?: Partial<EsdtToken>) {
        super(init);
        Object.assign(this, init);
        if (init.assets) {
            this.assets = new AssetsModel(init.assets);
        }
        if (init.roles) {
            this.roles = init.roles.map((role) => new RolesModel(role));
        }
    }
}
