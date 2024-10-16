export class EsdtToken {
    identifier: string;
    name: string;
    ticker: string;
    owner: string;
    minted?: string;
    burnt?: string;
    initialMinted?: string;
    decimals: number;
    derivedEGLD: string;
    price?: string;
    supply?: string;
    circulatingSupply?: string;
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
    type?: string;
    balance?: string;

    constructor(init?: Partial<EsdtToken>) {
        Object.assign(this, init);
    }
}

export class PairMetadata {
    address: string;
    firstToken: EsdtToken;
    secondToken: EsdtToken;
    totalFeePercent: number;

    constructor(init?: Partial<PairMetadata>) {
        Object.assign(this, init);
    }
}

export class PriceDiscoveryMetadata {
    address: string;
    launchedTokenID: string;
    acceptedTokenID: string;

    constructor(init?: Partial<PriceDiscoveryMetadata>) {
        Object.assign(this, init);
    }
}
