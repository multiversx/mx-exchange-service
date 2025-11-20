import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import {
    ClaimProgress,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { Prop } from '@nestjs/mongoose';
import mongoose from 'mongoose';

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
    @Field(() => [UserInfoByWeekModel], {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    boostedRewardsWeeklyInfo: UserInfoByWeekModel[];
    @Field(() => ClaimProgress, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
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
    @Field(() => [UserInfoByWeekModel], {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    boostedRewardsWeeklyInfo: UserInfoByWeekModel[];
    @Field(() => ClaimProgress, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    claimProgress: ClaimProgress;
    @Field({ nullable: true })
    accumulatedRewards: string;
    @Field({ nullable: true })
    estimatedWeeklyRewards: string;
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
    @Prop({ unique: true })
    @Field()
    address: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    farmedToken: EsdtToken;

    @Prop({ index: true })
    farmedTokenId: string;

    @Prop({ default: '0' })
    @Field()
    farmedTokenPriceUSD: string;

    @Field({ complexity: nestedFieldComplexity })
    farmToken: NftCollection;

    @Prop({ index: true })
    farmTokenCollection: string;

    @Prop({ default: 18 })
    farmTokenDecimals: number;

    @Prop({ default: '0' })
    @Field()
    farmTokenPriceUSD: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EsdtToken',
        index: true,
        required: true,
    })
    @Field({ complexity: nestedFieldComplexity })
    farmingToken: EsdtToken;

    @Prop({ index: true })
    farmingTokenId: string;

    @Prop({ default: '0' })
    @Field()
    farmingTokenPriceUSD: string;

    @Prop({ default: false, index: true })
    @Field()
    produceRewardsEnabled: boolean;

    @Prop({ default: '0' })
    @Field()
    perBlockRewards: string;

    @Prop({ default: '0' })
    @Field()
    farmTokenSupply: string;

    @Prop({ default: 0 })
    @Field(() => Int)
    penaltyPercent: number;

    @Prop({ default: 0 })
    @Field(() => Int)
    minimumFarmingEpochs: number;

    @Prop({ default: '0' })
    @Field()
    rewardPerShare: string;

    @Prop({ default: '0' })
    @Field()
    rewardReserve: string;

    @Prop({ default: 0 })
    @Field(() => Int)
    lastRewardBlockNonce: number;

    @Prop({ default: '0' })
    @Field()
    divisionSafetyConstant: string;

    @Prop({ default: '0' })
    @Field()
    totalValueLockedUSD: string;

    @Prop({ index: true })
    @Field()
    state: string;

    @Field()
    version: FarmVersion;

    @Prop({ default: null })
    @Field({ nullable: true })
    burnGasLimit: string;

    @Field({ nullable: true })
    transferExecGasLimit: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PairModel',
        index: true,
        default: null,
    })
    @Field({ nullable: true, complexity: nestedFieldComplexity })
    pair: PairModel;

    @Prop({ index: true, nullable: true })
    pairAddress: string;

    @Field({ nullable: true })
    lastErrorMessage: string;

    constructor(init?: Partial<BaseFarmModel>) {
        Object.assign(this, init);
    }
}
