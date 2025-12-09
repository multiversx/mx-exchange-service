export enum TokenType {
    TOKEN_TYPE_UNSPECIFIED = 0,
    /** TOKEN_TYPE_FUNGIBLE_TOKEN - FungibleESDT */
    TOKEN_TYPE_FUNGIBLE_TOKEN = 1,
    /** TOKEN_TYPE_FUNGIBLE_LP_TOKEN - FungibleESDT-LP */
    TOKEN_TYPE_FUNGIBLE_LP_TOKEN = 2,
    UNRECOGNIZED = -1,
}

export interface Token {
    identifier: string;
    decimals: number;
    name: string;
    ticker: string;
    owner: string;
    minted?: string;
    burnt?: string;
    initialMinted?: string;
    derivedEGLD?: string;
    price?: string;
    previous24hPrice?: string;
    previous7dPrice?: string;
    volumeUSD24h?: string;
    previous24hVolume?: string;
    liquidityUSD?: string;
    swapCount24h?: number;
    previous24hSwapCount?: number;
    priceChange24h?: number;
    priceChange7d?: number;
    tradeChange24h?: number;
    volumeUSDChange24h?: number;
    trendingScore?: string;
    supply?: string;
    circulatingSupply?: string;
    assets?: TokenAssets | undefined;
    transactions?: number;
    accounts?: number;
    isPaused?: boolean;
    canUpgrade?: boolean;
    canMint?: boolean;
    canBurn?: boolean;
    canChangeOwner?: boolean;
    canPause?: boolean;
    canFreeze?: boolean;
    canWipe?: boolean;
    type?: TokenType;
    roles?: TokenRole[];
    createdAt?: string;
    pairAddress?: string;
}

export interface TokenRole {
    address?: string;
    canMint?: boolean;
    canBurn?: boolean;
    roles?: string[];
}

export interface TokenAssets {
    website?: string;
    description?: string;
    social?: TokenSocial | undefined;
    status?: string;
    pngUrl?: string;
    svgUrl?: string;
    lockedAccounts?: string[];
    extraTokens?: string[];
}

export interface TokenSocial {
    email?: string;
    blog?: string;
    twitter?: string;
    coinmarketcap?: string;
    coingecko?: string;
}
