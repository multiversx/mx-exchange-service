import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FarmRewardType, FarmVersion } from './farm.model';
import { GlobalInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { PairModel } from 'src/modules/pair/models/pair.model';

@ObjectType()
export class BoostedYieldsFactors {
    @Field()
    maxRewardsFactor: string;
    @Field()
    userRewardsEnergy: string;
    @Field()
    userRewardsFarm: string;
    @Field()
    minEnergyAmount: string;
    @Field()
    minFarmAmount: string;

    constructor(init: BoostedYieldsFactors) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmModelV2 {
    @Field()
    address: string;
    @Field({ complexity: nestedFieldComplexity })
    farmedToken: EsdtToken;
    @Field()
    farmedTokenPriceUSD: string;
    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;
    @Field()
    farmTokenPriceUSD: string;
    @Field({ complexity: nestedFieldComplexity })
    farmingToken: EsdtToken;
    @Field()
    farmingTokenPriceUSD: string;
    @Field()
    produceRewardsEnabled: boolean;
    @Field()
    perBlockRewards: string;
    @Field()
    farmTokenSupply: string;
    @Field(() => Int)
    penaltyPercent: number;
    @Field(() => Int)
    minimumFarmingEpochs: number;
    @Field()
    rewardPerShare: string;
    @Field()
    rewardReserve: string;
    @Field(() => Int)
    lastRewardBlockNonce: number;
    @Field()
    divisionSafetyConstant: string;
    @Field()
    totalValueLockedUSD: string;
    @Field()
    state: string;
    @Field()
    version: FarmVersion;
    @Field({ nullable: true })
    burnGasLimit: string;
    @Field({ nullable: true })
    transferExecGasLimit: string;
    @Field({ nullable: true, complexity: nestedFieldComplexity })
    pair: PairModel;
    @Field({ nullable: true })
    lastErrorMessage: string;
    @Field(() => Int)
    boostedYieldsRewardsPercenatage: number;
    @Field(() => BoostedYieldsFactors, { complexity: nestedFieldComplexity })
    boostedYieldsFactors: BoostedYieldsFactors;
    @Field({ nullable: true })
    lockingScAddress: string;
    @Field({ nullable: true })
    lockEpochs: string;
    @Field()
    undistributedBoostedRewards: string;
    @Field()
    undistributedBoostedRewardsClaimed: string;
    @Field()
    energyFactoryAddress: string;
    @Field()
    rewardType: FarmRewardType;
    @Field({ complexity: nestedFieldComplexity })
    time: WeekTimekeepingModel;
    @Field()
    accumulatedRewards: string;
    @Field(() => [GlobalInfoByWeekModel], { complexity: nestedFieldComplexity })
    boosterRewards: GlobalInfoByWeekModel[];
    @Field()
    lastGlobalUpdateWeek: number;
    @Field()
    farmTokenSupplyCurrentWeek: string;
    @Field()
    baseApr: string;
    @Field()
    boostedApr: string;
    @Field()
    optimalEnergyPerLp: string;
    boostedRewardsPerWeek: string;
    farmedTokenId: string;
    farmTokenCollection: string;
    farmTokenDecimals: number;
    farmingTokenId: string;
    pairAddress: string;

    constructor(init?: Partial<FarmModelV2>) {
        Object.assign(this, init);
    }
}
