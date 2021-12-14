import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { NftCollection } from '../../../models/tokens/nftCollection.model';
import { FarmTokenAttributesModel } from './farmTokenAttributes.model';

export enum FarmVersion {
    V1_2 = 'v1.2',
    V1_3 = 'v1.3',
}

export enum FarmRewardType {
    UNLOCKED_REWARDS = 'unlockedRewards',
    LOCKED_REWARDS = 'lockedRewards',
    CUSTOM_REWARDS = 'customRewards',
}

registerEnumType(FarmVersion, { name: 'FarmVersion' });
registerEnumType(FarmRewardType, { name: 'FarmRewardType' });

@ObjectType()
export class RewardsModel {
    @Field(() => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
    @Field()
    rewards: string;
    @Field(() => Int, { nullable: true })
    remainingFarmingEpochs?: number;

    constructor(init?: Partial<RewardsModel>) {
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
export class FarmModel {
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
    perBlockRewards: string;

    @Field()
    farmTokenSupply: string;

    @Field({ nullable: true })
    farmingTokenReserve: string;

    @Field(() => Int)
    penaltyPercent: number;

    @Field(() => Int)
    minimumFarmingEpochs: number;

    @Field()
    rewardPerShare: string;

    @Field(() => Int)
    lastRewardBlockNonce: number;

    @Field({ nullable: true })
    undistributedFees: string;

    @Field({ nullable: true })
    currentBlockFee: string;

    @Field()
    divisionSafetyConstant: string;

    @Field(() => Int, { nullable: true })
    aprMultiplier: number;

    @Field({ nullable: true })
    apr: string;

    @Field({ nullable: true })
    lockedRewardsAPR: string;

    @Field({ nullable: true })
    unlockedRewardsAPR: string;

    @Field()
    totalValueLockedUSD: string;

    @Field({ nullable: true })
    lockedFarmingTokenReserveUSD: string;

    @Field({ nullable: true })
    unlockedFarmingTokenReserveUSD: string;

    @Field({ nullable: true })
    lockedFarmingTokenReserve: string;

    @Field({ nullable: true })
    unlockedFarmingTokenReserve: string;

    @Field()
    state: string;

    @Field({ nullable: true })
    requireWhitelist: boolean;

    @Field()
    version: FarmVersion;

    @Field({ nullable: true })
    rewardType: FarmRewardType;

    constructor(init?: Partial<FarmModel>) {
        Object.assign(this, init);
    }
}
