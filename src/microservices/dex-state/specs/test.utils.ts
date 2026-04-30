import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { PairModel, PairCompoundedAPRModel } from 'src/modules/pair/models/pair.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { FarmVersion, FarmRewardType } from 'src/modules/farm/models/farm.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import {
    Tokens,
    pairs,
    MockedTokens,
} from 'src/modules/pair/mocks/pair.constants';

export { Tokens, pairs, MockedTokens };

export function createMockToken(
    identifier: string,
    options?: Partial<EsdtToken>,
): EsdtToken {
    return new EsdtToken({
        identifier,
        name: options?.name ?? `Token ${identifier}`,
        ticker: options?.ticker ?? identifier.split('-')[0],
        decimals: options?.decimals ?? 18,
        owner: options?.owner ?? 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
        derivedEGLD: options?.derivedEGLD ?? '0',
        price: options?.price ?? '0',
        type: options?.type ?? EsdtTokenType.FungibleToken,
        liquidityUSD: options?.liquidityUSD ?? '0',
        transactions: options?.transactions ?? 0,
        accounts: options?.accounts ?? 0,
        isPaused: options?.isPaused ?? false,
        canUpgrade: options?.canUpgrade ?? true,
        canMint: options?.canMint ?? true,
        canBurn: options?.canBurn ?? true,
        canChangeOwner: options?.canChangeOwner ?? true,
        canPause: options?.canPause ?? true,
        canFreeze: options?.canFreeze ?? true,
        canWipe: options?.canWipe ?? true,
        ...options,
    });
}

export function createMockWeekTimekeeping(
    options?: Partial<WeekTimekeepingModel>,
): WeekTimekeepingModel {
    return new WeekTimekeepingModel({
        scAddress: options?.scAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        currentWeek: options?.currentWeek ?? 1,
        startEpochForWeek: options?.startEpochForWeek ?? 1,
        endEpochForWeek: options?.endEpochForWeek ?? 7,
        firstWeekStartEpoch: options?.firstWeekStartEpoch ?? 1,
        ...options,
    });
}

export function createMockPair(
    address: string,
    options?: Partial<PairModel>,
): PairModel {
    const firstTokenId = options?.firstTokenId ?? 'WEGLD-123456';
    const secondTokenId = options?.secondTokenId ?? 'USDC-789012';
    const lpTokenId = options?.liquidityPoolTokenId ?? `LP-${address.slice(-6)}`;

    return new PairModel({
        address,
        firstTokenId,
        secondTokenId,
        liquidityPoolTokenId: lpTokenId,
        firstTokenPrice: options?.firstTokenPrice ?? '1',
        firstTokenPriceUSD: options?.firstTokenPriceUSD ?? '10',
        secondTokenPrice: options?.secondTokenPrice ?? '1',
        secondTokenPriceUSD: options?.secondTokenPriceUSD ?? '1',
        liquidityPoolTokenPriceUSD: options?.liquidityPoolTokenPriceUSD ?? '20',
        firstTokenLockedValueUSD: options?.firstTokenLockedValueUSD ?? '1000000',
        secondTokenLockedValueUSD: options?.secondTokenLockedValueUSD ?? '1000000',
        lockedValueUSD: options?.lockedValueUSD ?? '2000000',
        previous24hLockedValueUSD: options?.previous24hLockedValueUSD ?? '1900000',
        firstTokenVolume24h: options?.firstTokenVolume24h ?? '100000',
        secondTokenVolume24h: options?.secondTokenVolume24h ?? '100000',
        volumeUSD24h: options?.volumeUSD24h ?? '200000',
        previous24hVolumeUSD: options?.previous24hVolumeUSD ?? '180000',
        feesUSD24h: options?.feesUSD24h ?? '600',
        previous24hFeesUSD: options?.previous24hFeesUSD ?? '540',
        feesAPR: options?.feesAPR ?? '10.95',
        totalFeePercent: options?.totalFeePercent ?? 0.003,
        specialFeePercent: options?.specialFeePercent ?? 0.0005,
        feesCollectorCutPercentage: options?.feesCollectorCutPercentage ?? 50,
        trustedSwapPairs: options?.trustedSwapPairs ?? [],
        type: options?.type ?? 'Core',
        state: options?.state ?? 'Active',
        feeState: options?.feeState ?? true,
        whitelistedManagedAddresses: options?.whitelistedManagedAddresses ?? [],
        initialLiquidityAdder: options?.initialLiquidityAdder ?? '',
        feeDestinations: options?.feeDestinations ?? [],
        hasFarms: options?.hasFarms ?? false,
        hasDualFarms: options?.hasDualFarms ?? false,
        tradesCount: options?.tradesCount ?? 1000,
        tradesCount24h: options?.tradesCount24h ?? 100,
        deployedAt: options?.deployedAt ?? 1640000000,
        compoundedAPR: options?.compoundedAPR ?? new PairCompoundedAPRModel({
            address,
            feesAPR: '10.95',
            farmBaseAPR: '0',
            farmBoostedAPR: '0',
            dualFarmBaseAPR: '0',
            dualFarmBoostedAPR: '0',
        }),
        ...options,
    });
}

export function createMockFarm(
    address: string,
    options?: Partial<FarmModelV2>,
): FarmModelV2 {
    return new FarmModelV2({
        address,
        farmedTokenId: options?.farmedTokenId ?? 'MEX-123456',
        farmingTokenId: options?.farmingTokenId ?? 'EGLDMEX-abcdef',
        farmTokenCollection: options?.farmTokenCollection ?? 'FARM-123456',
        pairAddress: options?.pairAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        farmedTokenPriceUSD: options?.farmedTokenPriceUSD ?? '0.001',
        farmTokenPriceUSD: options?.farmTokenPriceUSD ?? '20',
        farmingTokenPriceUSD: options?.farmingTokenPriceUSD ?? '20',
        produceRewardsEnabled: options?.produceRewardsEnabled ?? true,
        perBlockRewards: options?.perBlockRewards ?? '1000000000000000000',
        farmTokenSupply: options?.farmTokenSupply ?? '1000000000000000000000000',
        penaltyPercent: options?.penaltyPercent ?? 0,
        minimumFarmingEpochs: options?.minimumFarmingEpochs ?? 3,
        rewardPerShare: options?.rewardPerShare ?? '0',
        rewardReserve: options?.rewardReserve ?? '1000000000000000000000',
        lastRewardBlockNonce: options?.lastRewardBlockNonce ?? 1000000,
        divisionSafetyConstant: options?.divisionSafetyConstant ?? '1000000000000',
        totalValueLockedUSD: options?.totalValueLockedUSD ?? '1000000',
        state: options?.state ?? 'Active',
        version: options?.version ?? FarmVersion.V2,
        boostedYieldsRewardsPercenatage: options?.boostedYieldsRewardsPercenatage ?? 60,
        boostedYieldsFactors: options?.boostedYieldsFactors ?? {
            maxRewardsFactor: '2.5',
            userRewardsEnergy: '3',
            userRewardsFarm: '2',
            minEnergyAmount: '1000000000000000000',
            minFarmAmount: '1000000000000000000',
        },
        energyFactoryAddress: options?.energyFactoryAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq4y6',
        rewardType: options?.rewardType ?? FarmRewardType.LOCKED_REWARDS,
        time: options?.time ?? createMockWeekTimekeeping(),
        accumulatedRewards: options?.accumulatedRewards ?? '0',
        boosterRewards: options?.boosterRewards ?? [],
        lastGlobalUpdateWeek: options?.lastGlobalUpdateWeek ?? 1,
        farmTokenSupplyCurrentWeek: options?.farmTokenSupplyCurrentWeek ?? '1000000000000000000000000',
        baseApr: options?.baseApr ?? '50',
        boostedApr: options?.boostedApr ?? '100',
        optimalEnergyPerLp: options?.optimalEnergyPerLp ?? '1000000000000000000',
        boostedRewardsPerWeek: options?.boostedRewardsPerWeek ?? '1000000000000000000000',
        undistributedBoostedRewards: options?.undistributedBoostedRewards ?? '0',
        undistributedBoostedRewardsClaimed: options?.undistributedBoostedRewardsClaimed ?? '0',
        ...options,
    });
}

export function createMockStakingFarm(
    address: string,
    options?: Partial<StakingModel>,
): StakingModel {
    return new StakingModel({
        address,
        farmTokenCollection: options?.farmTokenCollection ?? 'STAKE-123456',
        farmTokenDecimals: options?.farmTokenDecimals ?? 18,
        farmingTokenId: options?.farmingTokenId ?? 'RIDE-123456',
        farmingTokenPriceUSD: options?.farmingTokenPriceUSD ?? '1',
        rewardTokenId: options?.rewardTokenId ?? 'RIDE-123456',
        farmTokenSupply: options?.farmTokenSupply ?? '1000000000000000000000000',
        rewardPerShare: options?.rewardPerShare ?? '0',
        accumulatedRewards: options?.accumulatedRewards ?? '0',
        rewardCapacity: options?.rewardCapacity ?? '1000000000000000000000000',
        annualPercentageRewards: options?.annualPercentageRewards ?? '25',
        apr: options?.apr ?? '25',
        aprUncapped: options?.aprUncapped ?? '25',
        boostedApr: options?.boostedApr ?? '50',
        baseApr: options?.baseApr ?? '25',
        maxBoostedApr: options?.maxBoostedApr ?? '100',
        minUnboundEpochs: options?.minUnboundEpochs ?? 10,
        perBlockRewards: options?.perBlockRewards ?? '1000000000000000000',
        lastRewardBlockNonce: options?.lastRewardBlockNonce ?? 1000000,
        rewardsRemainingDays: options?.rewardsRemainingDays ?? 365,
        rewardsRemainingDaysUncapped: options?.rewardsRemainingDaysUncapped ?? 365,
        divisionSafetyConstant: options?.divisionSafetyConstant ?? '1000000000000',
        produceRewardsEnabled: options?.produceRewardsEnabled ?? true,
        state: options?.state ?? 'Active',
        boostedYieldsRewardsPercenatage: options?.boostedYieldsRewardsPercenatage ?? 60,
        boostedYieldsFactors: options?.boostedYieldsFactors ?? {
            maxRewardsFactor: '2.5',
            userRewardsEnergy: '3',
            userRewardsFarm: '2',
            minEnergyAmount: '1000000000000000000',
            minFarmAmount: '1000000000000000000',
        },
        optimalEnergyPerStaking: options?.optimalEnergyPerStaking ?? '1000000000000000000',
        time: options?.time ?? createMockWeekTimekeeping(),
        boosterRewards: options?.boosterRewards ?? [],
        lastGlobalUpdateWeek: options?.lastGlobalUpdateWeek ?? 1,
        farmTokenSupplyCurrentWeek: options?.farmTokenSupplyCurrentWeek ?? '1000000000000000000000000',
        energyFactoryAddress: options?.energyFactoryAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq4y6',
        accumulatedRewardsForWeek: options?.accumulatedRewardsForWeek ?? '0',
        undistributedBoostedRewards: options?.undistributedBoostedRewards ?? '0',
        undistributedBoostedRewardsClaimed: options?.undistributedBoostedRewardsClaimed ?? '0',
        stakingPositionMigrationNonce: options?.stakingPositionMigrationNonce ?? 0,
        deployedAt: options?.deployedAt ?? 1640000000,
        isProducingRewards: options?.isProducingRewards ?? true,
        stakedValueUSD: options?.stakedValueUSD ?? '1000000',
        ...options,
    });
}

export function createMockStakingProxy(
    address: string,
    options?: Partial<StakingProxyModel>,
): StakingProxyModel {
    return new StakingProxyModel({
        address,
        lpFarmAddress: options?.lpFarmAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        stakingFarmAddress: options?.stakingFarmAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqslllsm5a29a',
        stakingMinUnboundEpochs: options?.stakingMinUnboundEpochs ?? 10,
        pairAddress: options?.pairAddress ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        stakingTokenId: options?.stakingTokenId ?? 'RIDE-123456',
        farmTokenCollection: options?.farmTokenCollection ?? 'FARM-123456',
        dualYieldTokenCollection: options?.dualYieldTokenCollection ?? 'DUAL-123456',
        lpFarmTokenCollection: options?.lpFarmTokenCollection ?? 'LPFARM-123456',
        ...options,
    });
}

export function createMockFeesCollector(
    options?: Partial<FeesCollectorModel>,
): FeesCollectorModel {
    return new FeesCollectorModel({
        address: options?.address ?? 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqflllswdyp88',
        time: options?.time ?? createMockWeekTimekeeping(),
        startWeek: options?.startWeek ?? 1,
        endWeek: options?.endWeek ?? 52,
        lastGlobalUpdateWeek: options?.lastGlobalUpdateWeek ?? 1,
        undistributedRewards: options?.undistributedRewards ?? [],
        allTokens: options?.allTokens ?? [],
        knownContracts: options?.knownContracts ?? [],
        accumulatedFees: options?.accumulatedFees ?? [],
        rewardsClaimed: options?.rewardsClaimed ?? [],
        lockedTokenId: options?.lockedTokenId ?? 'XMEX-123456',
        lockedTokensPerBlock: options?.lockedTokensPerBlock ?? '1000000000000000000',
        lockedTokensPerEpoch: options?.lockedTokensPerEpoch ?? '14400000000000000000000',
        allowExternalClaimRewards: options?.allowExternalClaimRewards ?? true,
        lastLockedTokensAddWeek: options?.lastLockedTokensAddWeek ?? 1,
        ...options,
    });
}

// Use addresses from pair.constants.ts pairs array
export const TEST_ADDRESSES = {
    // Pair addresses from pairs array (Address.fromHex with incrementing hex values)
    PAIR_EGLD_MEX: pairs[0].address,  // 0x12
    PAIR_EGLD_USDC: pairs[1].address, // 0x13
    PAIR_TOK4_EGLD: pairs[2].address, // 0x14
    PAIR_EGLD_TOK5: pairs[3].address, // 0x15
    PAIR_TOK6_TOK5: pairs[4].address, // 0x16
    PAIR_TOK5_USDC: pairs[5].address, // 0x17
    PAIR_TOK5_USDT: pairs[6].address, // 0x18
    PAIR_EGLD_USDT: pairs[7].address, // 0x19
    // Farm/staking addresses (using different hex ranges)
    FARM_1: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhllllsajxzat',
    FARM_2: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8hlllls7a6h85',
    STAKING_1: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqslllsm5a29a',
    STAKING_2: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsllllsx0xk85',
    STAKING_3: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqslllls3a9x99',
    STAKING_PROXY_1: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0llllsj732yz',
    STAKING_PROXY_2: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0lllls7b3a24',
    FEES_COLLECTOR: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqflllswdyp88',
} as const;

// Use token IDs from pair.constants.ts MockedTokens array
export const TEST_TOKEN_IDS = {
    WEGLD: 'WEGLD-123456',
    MEX: 'MEX-123456',
    USDC: 'USDC-123456',
    USDT: 'USDT-123456',
    RIDE: 'RIDE-123456',
    TOK4: 'TOK4-123456',
    TOK5: 'TOK5-123456',
    TOK6: 'TOK6-123456',
    // LP tokens
    LP_EGLD_USDC: 'EGLDUSDCLP-abcdef',
    LP_EGLD_MEX: 'EGLDMEXLP-abcdef',
    LP_EGLD_TOK4: 'EGLDTOK4LP-abcdef',
    LP_EGLD_TOK5: 'EGLDTOK5LP-abcdef',
    LP_TOK5_TOK6: 'TOK5TOK6LP-abcdef',
    LP_TOK5_USDC: 'TOK5USDCLP-abcdef',
    LP_TOK5_USDT: 'TOK5USDTLP-abcdef',
    LP_EGLD_USDT: 'EGLDUSDTLP-abcdef',
} as const;
