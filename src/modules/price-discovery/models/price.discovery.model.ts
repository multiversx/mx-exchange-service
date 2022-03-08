import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@ObjectType()
export class PriceDiscoveryModel {
    @Field()
    address: string;
    @Field()
    launchedToken: EsdtToken;
    @Field()
    acceptedToken: EsdtToken;
    @Field()
    redeemToken: NftCollection;
    @Field()
    lpToken: EsdtToken;
    @Field()
    launchedTokenAmount: string;
    @Field()
    acceptedTokenAmount: string;
    @Field()
    lpTokensReceived: string;
    @Field()
    startBlock: number;
    @Field()
    endBlock: number;
    @Field()
    pairAddress: string;

    constructor(init?: Partial<PriceDiscoveryModel>) {
        Object.assign(this, init);
    }
}
