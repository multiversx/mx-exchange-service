import { Field, ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { INFTToken } from './nft.interface';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

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
    @Field(() => AssetsModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    assets?: AssetsModel;

    constructor(init?: Partial<NftToken>) {
        Object.assign(this, init);
        if (init.assets) {
            this.assets = new AssetsModel(init.assets);
        }
    }
}
