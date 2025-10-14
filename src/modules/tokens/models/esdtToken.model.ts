import { Field, ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { IEsdtToken } from './esdtToken.interface';
import { RolesModel } from './roles.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop, raw, Schema } from '@nestjs/mongoose';

export enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

export class BaseEsdtToken {
    @Prop({ unique: true })
    identifier: string;
    @Prop()
    decimals: number;

    constructor(init?: Partial<BaseEsdtToken>) {
        Object.assign(this, init);
    }

    static toEsdtToken(baseEsdtToken: BaseEsdtToken): EsdtToken {
        return new EsdtToken(baseEsdtToken);
    }
}

const assetsRaw = raw({
    website: { type: String },
    description: { type: String },
    social: {
        email: { type: String },
        blog: { type: String },
        twitter: { type: String },
        coinmarketcap: { type: String },
        coingecko: { type: String },
    },
    status: { type: String },
    pngUrl: { type: String },
    svgUrl: { type: String },
    extraTokens: { type: [String] },
});

const rolesRaw = {
    address: String,
    canMint: Boolean,
    canBurn: Boolean,
    roles: [String],
};

@ObjectType({
    implements: () => [IEsdtToken],
})
@Schema({
    collection: 'esdt_tokens',
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
})
export class EsdtToken extends BaseEsdtToken implements IEsdtToken {
    @Prop({ index: true })
    name: string;
    @Prop({ index: true })
    ticker: string;
    @Prop()
    owner: string;
    @Prop({ required: false })
    minted?: string;
    @Prop({ required: false })
    burnt?: string;
    @Prop({ required: false })
    initialMinted?: string;
    @Prop({ default: '0' })
    @Field()
    derivedEGLD: string;
    @Prop({ required: false, default: '0' })
    price?: string;
    @Prop({ required: false, default: '0' })
    @Field()
    previous24hPrice?: string;
    @Prop({ required: false, default: '0' })
    @Field()
    previous7dPrice?: string;
    @Prop({ required: false, default: '0' })
    @Field()
    volumeUSD24h?: string;
    @Prop({ required: false, default: '0' })
    @Field()
    previous24hVolume?: string;
    @Prop({ required: false, default: '0' })
    @Field()
    liquidityUSD?: string;
    @Prop({ required: false, default: 0 })
    @Field()
    swapCount24h?: number;
    @Prop({ required: false, default: 0 })
    @Field()
    previous24hSwapCount?: number;
    @Prop({ required: false })
    @Field()
    trendingScore?: string;
    @Prop({ required: false })
    @Field()
    supply?: string;
    @Prop({ required: false })
    @Field()
    circulatingSupply?: string;
    @Prop(assetsRaw)
    @Field(() => AssetsModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    assets?: AssetsModel;
    @Prop()
    transactions: number;
    @Prop()
    accounts: number;
    @Prop()
    isPaused: boolean;
    @Prop()
    canUpgrade: boolean;
    @Prop()
    canMint: boolean;
    @Prop()
    canBurn: boolean;
    @Prop()
    canChangeOwner: boolean;
    @Prop()
    canPause: boolean;
    @Prop()
    canFreeze: boolean;
    @Prop()
    canWipe: boolean;
    @Prop(rolesRaw)
    @Field(() => RolesModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    roles?: RolesModel;
    @Prop({ required: false, index: true })
    type?: string;
    @Prop({ required: false })
    balance?: string;
    @Prop({ required: false })
    createdAt?: string;
    @Prop({ required: false, index: true })
    pairAddress?: string;
    @Prop({ default: 0 })
    priceChange24h?: number;
    @Prop({ default: 0 })
    priceChange7d?: number;
    @Prop({ default: 0 })
    tradeChange24h?: number;
    @Prop({ default: 0 })
    volumeUSDChange24h?: number;

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
