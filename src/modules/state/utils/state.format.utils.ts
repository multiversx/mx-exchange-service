import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';

export function formatToken(
    token: EsdtToken,
    fields: (keyof EsdtToken)[] = [],
): EsdtToken {
    if (fields.length === 0) {
        return new EsdtToken({
            ...token,
            ...(!token.liquidityUSD && { liquidityUSD: '0' }),
            ...(!token.previous24hPrice && { previous24hPrice: '0' }),
            ...(!token.previous7dPrice && { previous7dPrice: '0' }),
            ...(!token.previous24hSwapCount && { previous24hSwapCount: 0 }),
            ...(!token.volumeUSD24h && { volumeUSD24h: '0' }),
        });
    }

    return new EsdtToken({
        ...token,
        ...(fields.includes('liquidityUSD') && {
            liquidityUSD: token.liquidityUSD ?? '0',
        }),
        ...(fields.includes('previous24hPrice') && {
            previous24hPrice: token.previous24hPrice ?? '0',
        }),
        ...(fields.includes('previous7dPrice') && {
            previous7dPrice: token.previous7dPrice ?? '0',
        }),
        ...(fields.includes('previous24hSwapCount') && {
            previous24hSwapCount: token.previous24hSwapCount ?? 0,
        }),
        ...(fields.includes('volumeUSD24h') && {
            volumeUSD24h: token.volumeUSD24h ?? '0',
        }),
    });
}

export function formatPair(
    pair: PairModel,
    fields: (keyof PairModel)[],
): PairModel {
    if (fields.length === 0) {
        return new PairModel({
            ...pair,
            trustedSwapPairs: pair.trustedSwapPairs ?? [],
            feeDestinations: pair.feeDestinations ?? [],
            whitelistedManagedAddresses: pair.whitelistedManagedAddresses ?? [],
        });
    }

    return new PairModel({
        ...pair,
        ...(fields.includes('trustedSwapPairs') && {
            trustedSwapPairs: pair.trustedSwapPairs ?? [],
        }),
        ...(fields.includes('feeDestinations') && {
            feeDestinations: pair.feeDestinations ?? [],
        }),
        ...(fields.includes('whitelistedManagedAddresses') && {
            whitelistedManagedAddresses: pair.whitelistedManagedAddresses ?? [],
        }),
    });
}

export function formatFarm(
    farm: FarmModelV2,
    fields: (keyof FarmModelV2)[],
): FarmModelV2 {
    if (fields.length === 0) {
        return new FarmModelV2({
            ...farm,
            boosterRewards:
                farm.boosterRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
            version: FarmVersion.V2,
        });
    }

    return new FarmModelV2({
        ...farm,
        ...(fields.includes('boosterRewards') && {
            boosterRewards:
                farm.boosterRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
        }),
        version: FarmVersion.V2,
    });
}

export function formatStakingFarm(
    stakingFarm: StakingModel,
    fields: (keyof StakingModel)[],
): StakingModel {
    if (fields.length === 0) {
        return new StakingModel({
            ...stakingFarm,
            boosterRewards:
                stakingFarm.boosterRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
        });
    }

    return new StakingModel({
        ...stakingFarm,
        ...(fields.includes('boosterRewards') && {
            boosterRewards:
                stakingFarm.boosterRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
        }),
    });
}

export function formatFeesCollector(
    feesCollector: FeesCollectorModel,
    fields: (keyof FeesCollectorModel)[],
): FeesCollectorModel {
    if (fields.length === 0) {
        return new FeesCollectorModel({
            ...feesCollector,
            undistributedRewards:
                feesCollector.undistributedRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
            allTokens: feesCollector.allTokens ?? [],
            knownContracts: feesCollector.knownContracts ?? [],
            accumulatedFees: feesCollector.accumulatedFees ?? [],
            rewardsClaimed: feesCollector.rewardsClaimed ?? [],
        });
    }

    return new FeesCollectorModel({
        ...feesCollector,
        ...(fields.includes('undistributedRewards') && {
            undistributedRewards:
                feesCollector.undistributedRewards?.map((globalInfo) =>
                    formatGlobalInfoModel(globalInfo),
                ) ?? [],
            ...(fields.includes('allTokens') && {
                allTokens: feesCollector.allTokens ?? [],
            }),
            ...(fields.includes('knownContracts') && {
                knownContracts: feesCollector.knownContracts ?? [],
            }),
            ...(fields.includes('accumulatedFees') && {
                accumulatedFees: feesCollector.accumulatedFees ?? [],
            }),
            ...(fields.includes('rewardsClaimed') && {
                rewardsClaimed: feesCollector.rewardsClaimed ?? [],
            }),
        }),
    });
}

export function formatGlobalInfoModel(
    globalInfo: GlobalInfoByWeekModel,
): GlobalInfoByWeekModel {
    return new GlobalInfoByWeekModel({
        ...globalInfo,
        totalRewardsForWeek: globalInfo.totalRewardsForWeek ?? [],
        rewardsDistributionForWeek: globalInfo.rewardsDistributionForWeek ?? [],
    });
}
