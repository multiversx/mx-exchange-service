import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

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
    state: boolean;
    @Field()
    owner: string;
    @Field()
    temporaryOwnerPeriod: string;
    @Field()
    pairCount: number;
    @Field()
    pairCreationEnabled: boolean;
    @Field()
    pairTemplateAddress: string;
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
    @Field()
    defaultSlippage: number;
    @Field(() => [Float])
    slippageValues: number[];
    @Field()
    minSlippage: number;
    @Field()
    maxSlippage: number;
    @Field()
    minSwapAmount: number;
    @Field()
    lastErrorMessage: string;

    constructor(init?: Partial<FactoryModel>) {
        Object.assign(this, init);
    }
}
