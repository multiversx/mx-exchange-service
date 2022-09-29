import { ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { INFTToken } from './nft.interface';

@ObjectType({
    implements: () => [INFTToken],
})
export class NftToken implements INFTToken {
    identifier: string;
    collection: string;
    ticker: string;
    decimals: number;
    timestamp?: number;
    attributes: string;
    nonce: number;
    type: string;
    name: string;
    creator: string;
    royalties?: number;
    uris?: string[];
    url?: string;
    tags?: string[];
    balance: string;
    assets?: AssetsModel;

    constructor(init?: Partial<NftToken>) {
        Object.assign(this, init);
    }
}
