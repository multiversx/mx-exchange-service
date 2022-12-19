import { ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { INFTCollection } from './nft.interface';
import { RolesModel } from './roles.model';

@ObjectType({
    implements: () => [INFTCollection],
})
export class NftCollection implements INFTCollection {
    collection: string;
    name: string;
    ticker: string;
    decimals: number;
    issuer: string;
    timestamp: number;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    canAddSpecialRoles: boolean;
    canTransferNFTCreateRole: boolean;
    NFTCreateStopped: boolean;
    assets?: AssetsModel;
    roles?: RolesModel;

    constructor(init?: Partial<NftCollection>) {
        Object.assign(this, init);
    }
}
