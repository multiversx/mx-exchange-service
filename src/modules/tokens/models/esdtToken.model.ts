import { ObjectType } from '@nestjs/graphql';
import { IAssets, IEsdtToken, IRoles } from './esdtToken.interface';

export enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

@ObjectType({
    implements: () => [IAssets],
})
export class AssetsModel implements IAssets {
    website?: string;
    description?: string;
    status?: string;
    pngUrl?: string;
    svgUrl?: string;
    lockedAccounts?: string[];
    extraTokens?: string[];

    constructor(init?: Partial<AssetsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType({
    implements: () => [IRoles],
})
export class RolesModel implements IRoles {
    address?: string;
    canMint?: boolean;
    canBurn?: boolean;
    roles?: string[];

    constructor(init?: Partial<RolesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType({
    implements: () => [IEsdtToken],
})
export class EsdtToken implements IEsdtToken {
    identifier: string;
    name: string;
    ticker: string;
    owner: string;
    minted?: string;
    burnt?: string;
    initialMinted?: string;
    decimals: number;
    price?: string;
    supply?: string;
    circulatingSupply?: string;
    assets?: IAssets;
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
    roles?: IRoles;
    type?: string;
    balance?: string;

    constructor(init?: Partial<EsdtToken>) {
        Object.assign(this, init);
    }
}
