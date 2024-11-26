import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import {
    ClaimProgress,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';

export enum FarmVersion {
    V1_2 = 'v1.2',
    V1_3 = 'v1.3',
    V2 = 'v2',
    CUSTOM = 'custom',
}

export enum FarmRewardType {
    UNLOCKED_REWARDS = 'unlockedRewards',
    LOCKED_REWARDS = 'lockedRewards',
    CUSTOM_REWARDS = 'customRewards',
    DEPRECATED = 'deprecated',
}

registerEnumType(FarmVersion, { name: 'FarmVersion' });
registerEnumType(FarmRewardType, { name: 'FarmRewardType' });

@ObjectType()
export class RewardsModel {
    @Field()
    identifier: string;
    @Field()
    rewards: string;
    @Field(() => Int, { nullable: true })
    remainingFarmingEpochs?: number;
    @Field(() => [UserInfoByWeekModel], { nullable: true })
    boostedRewardsWeeklyInfo: UserInfoByWeekModel[];
    @Field(() => ClaimProgress, { nullable: true })
    claimProgress: ClaimProgress;
    @Field({ nullable: true })
    accumulatedRewards: string;

    constructor(init?: Partial<RewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class BoostedRewardsModel {
    @Field()
    farmAddress: string;
    @Field()
    userAddress: string;
    @Field(() => [UserInfoByWeekModel], { nullable: true })
    boostedRewardsWeeklyInfo: UserInfoByWeekModel[];
    @Field(() => ClaimProgress, { nullable: true })
    claimProgress: ClaimProgress;
    @Field({ nullable: true })
    accumulatedRewards: string;
    @Field({ nullable: true })
    curentBoostedAPR: number;
    @Field({ nullable: true })
    maximumBoostedAPR: number;

    constructor(init?: Partial<BoostedRewardsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserTotalBoostedPosition {
    @Field()
    address: string;
    @Field()
    boostedTokensAmount: string;

    constructor(init?: Partial<UserTotalBoostedPosition>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ExitFarmTokensModel {
    @Field()
    farmingTokens: string;
    @Field()
    rewards: string;

    constructor(init?: Partial<ExitFarmTokensModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmMigrationConfig {
    @Field()
    migrationRole: string;
    @Field()
    oldFarmAddress: string;
    @Field()
    oldFarmTokenID: string;
    @Field({ nullable: true })
    newFarmAddress?: string;
    @Field({ nullable: true })
    newLockedFarmAddress?: string;

    constructor(init?: Partial<FarmMigrationConfig>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class BaseFarmModel {
    @Field()
    address: string;

    @Field()
    farmedToken: EsdtToken;

    @Field()
    farmedTokenPriceUSD: string;

    @Field()
    farmToken: NftCollection;

    @Field()
    farmTokenPriceUSD: string;

    @Field()
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

    @Field({ nullable: true })
    pair: PairModel;

    @Field({ nullable: true })
    lastErrorMessage: string;

    constructor(init?: Partial<BaseFarmModel>) {
        Object.assign(this, init);
    }
}
