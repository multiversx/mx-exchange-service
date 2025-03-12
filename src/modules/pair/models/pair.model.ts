import { ObjectType, Field, ArgsType, Int } from '@nestjs/graphql';
import { PaginationArgs } from '../../dex.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from './pair-info.model';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { ComplexityEstimatorArgs } from 'graphql-query-complexity';

@ArgsType()
export class GetPairsArgs extends PaginationArgs {}

@ObjectType()
export class LiquidityPosition {
    @Field()
    firstTokenAmount: string;

    @Field()
    secondTokenAmount: string;

    constructor(init?: Partial<LiquidityPosition>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedTokensInfo {
    @Field({
        deprecationReason:
            'field is deprecated and will be removed on next release;' +
            'value can be obtained from lockingSC field',
    })
    lockingScAddress: string;
    @Field(() => SimpleLockModel, { complexity: nestedFieldComplexity })
    lockingSC: SimpleLockModel;
    @Field(() => Int)
    unlockEpoch: number;
    @Field(() => Int)
    lockingDeadlineEpoch: number;

    constructor(init?: Partial<LockedTokensInfo>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairCompoundedAPRModel {
    @Field()
    address: string;

    @Field({ nullable: true })
    feesAPR: string;

    @Field({ nullable: true })
    farmBaseAPR: string;

    @Field({ nullable: true })
    farmBoostedAPR: string;

    @Field({ nullable: true })
    dualFarmBaseAPR: string;

    @Field({ nullable: true })
    dualFarmBoostedAPR: string;

    constructor(init?: Partial<PairCompoundedAPRModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairRewardTokensModel {
    @Field()
    address: string;

    @Field(() => [EsdtToken], {
        complexity: (options: ComplexityEstimatorArgs) => {
            return nestedFieldComplexity(options) * 2;
        },
    })
    poolRewards: EsdtToken[];

    @Field({ nullable: true, complexity: nestedFieldComplexity })
    farmReward: NftCollection;

    @Field({ nullable: true, complexity: nestedFieldComplexity })
    dualFarmReward: EsdtToken;

    constructor(init?: Partial<PairRewardTokensModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairModel {
    @Field()
    address: string;

    @Field({ complexity: nestedFieldComplexity })
    firstToken: EsdtToken;

    @Field({ complexity: nestedFieldComplexity })
    secondToken: EsdtToken;

    @Field()
    firstTokenPrice: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPrice: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field({ complexity: nestedFieldComplexity })
    liquidityPoolToken: EsdtToken;

    @Field()
    liquidityPoolTokenPriceUSD: string;

    @Field()
    firstTokenLockedValueUSD: string;

    @Field()
    secondTokenLockedValueUSD: string;

    @Field()
    lockedValueUSD: string;

    @Field()
    previous24hLockedValueUSD: string;

    @Field()
    firstTokenVolume24h: string;

    @Field()
    secondTokenVolume24h: string;

    @Field()
    volumeUSD24h: string;

    @Field()
    previous24hVolumeUSD: string;

    @Field()
    feesUSD24h: string;

    @Field()
    previous24hFeesUSD: string;

    @Field()
    feesAPR: string;

    @Field(() => PairInfoModel, { complexity: nestedFieldComplexity })
    info: PairInfoModel;

    @Field()
    totalFeePercent: number;

    @Field()
    specialFeePercent: number;

    @Field({
        description: 'Percentage of special fees that go to the fees collector',
    })
    feesCollectorCutPercentage: number;

    @Field(() => [String])
    trustedSwapPairs: string[];

    @Field()
    type: string;

    @Field()
    state: string;

    @Field()
    feeState: boolean;

    @Field(() => LockedTokensInfo, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    lockedTokensInfo: LockedTokensInfo;

    @Field(() => [String])
    whitelistedManagedAddresses: string[];

    @Field()
    initialLiquidityAdder: string;

    @Field(() => [FeeDestination], { complexity: nestedFieldComplexity })
    feeDestinations: FeeDestination[];

    @Field(() => FeesCollectorModel, {
        nullable: true,
        description: 'Fees collector set for this pair',
        complexity: nestedFieldComplexity,
    })
    feesCollector: FeesCollectorModel;

    @Field()
    hasFarms: boolean;

    @Field()
    hasDualFarms: boolean;

    @Field(() => Int)
    tradesCount: number;

    @Field(() => Int)
    tradesCount24h: number;

    @Field(() => Int, { nullable: true })
    deployedAt: number;

    @Field(() => PairCompoundedAPRModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    compoundedAPR: PairCompoundedAPRModel;

    @Field(() => PairRewardTokensModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    rewardTokens: PairRewardTokensModel;

    @Field({ nullable: true })
    farmAddress: string;

    @Field({ nullable: true })
    stakingProxyAddress: string;

    constructor(init?: Partial<PairModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairTokens {
    @Field()
    firstTokenID: string;

    @Field()
    secondTokenID: string;

    constructor(init?: Partial<PairTokens>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FeeDestination {
    @Field()
    address: string;
    @Field()
    tokenID: string;

    constructor(init?: Partial<FeeDestination>) {
        Object.assign(this, init);
    }
}
