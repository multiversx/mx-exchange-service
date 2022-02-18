import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@ObjectType()
export class StakingProxyModel {
    @Field()
    address: string;
    @Field()
    lpFarmAddress: string;
    @Field()
    stakingFarmAddress: string;
    @Field()
    pairAddress: string;
    @Field()
    stakingToken: EsdtToken;
    @Field()
    farmToken: NftCollection;
    @Field()
    dualYieldToken: NftCollection;
    @Field()
    lpFarmToken: NftCollection;

    constructor(init?: Partial<StakingProxyModel>) {
        Object.assign(this, init);
    }
}
