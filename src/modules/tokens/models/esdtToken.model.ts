import { ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { IEsdtToken } from './esdtToken.interface';
import { RolesModel } from './roles.model';

export enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
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
    derivedEGLD: string;
    price?: string;
    previous24hPrice?: string;
    supply?: string;
    circulatingSupply?: string;
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
    roles?: RolesModel;
    type?: string;
    balance?: string;
    previous7dPrice?: string;

    constructor(init?: Partial<EsdtToken>) {
        Object.assign(this, init);
        this.assets = new AssetsModel(init.assets);
        this.roles = new RolesModel(init.roles);
    }
}
