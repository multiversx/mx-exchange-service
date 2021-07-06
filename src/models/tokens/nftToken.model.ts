import { ObjectType } from '@nestjs/graphql';
import { NftCollection } from '../interfaces/nftCollection.interface';
import { BaseNftToken } from '../interfaces/nftToken.interface';

@ObjectType({
    implements: () => [BaseNftToken],
})
export class NftToken implements BaseNftToken {
    identifier: string;
    collection: string;
    timestamp: number;
    attributes: string;
    nonce: number;
    type: string;
    name: string;
    creator: string;
    royalties: number;
    uris: string[];
    url: string;
    tags: string[];
    balance: string;
}

@ObjectType({
    implements: () => [NftCollection],
})
export class NftCollectionToken implements NftCollection {
    collection: string;
    name: string;
    ticker: string;
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
}
