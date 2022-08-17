import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class EnableSwapByUserConfig {
    @Field() lockedTokenID: string;
    @Field() minLockedTokenValue: string;
    @Field(() => Int) minLockPeriodEpochs: number;

    constructor(init?: Partial<EnableSwapByUserConfig>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FactoryModel {
    @Field()
    address: string;
    @Field()
    pairCount: number;
    @Field()
    totalTxCount: number;
    @Field()
    totalValueLockedUSD: string;
    @Field()
    totalVolumeUSD24h: string;
    @Field()
    totalFeesUSD24h: string;
    @Field()
    maintenance: boolean;
    @Field()
    multiSwapStatus: boolean;
    @Field(() => [String])
    commonTokensForUserPairs: string[];
    @Field(() => EnableSwapByUserConfig)
    enableSwapByUserConfig: EnableSwapByUserConfig;

    constructor(init?: Partial<FactoryModel>) {
        Object.assign(this, init);
    }
}
