import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { Model, UpdateWriteOpResult } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress, tokenProviderUSD } from 'src/config';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import {
    LockedTokensInfo,
    PairModel,
} from 'src/modules/pair/models/pair.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { CacheService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { MongoServerError } from 'mongodb';
import { Logger } from 'winston';
import { BulkUpdatesService } from '../../../microservices/dex-state/services/bulk.updates.service';
import { StateSnapshot, StateSnapshotDocument } from '../state.snapshot.schema';
import { farmsAddresses, farmType } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';

const MIN_TRENDING_SCORE = -(10 ** 9);

@Injectable()
export class StateSyncService {
    private readonly bulkUpdatesService: BulkUpdatesService;

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmComputeServiceV2))
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly cacheService: CacheService,
        private readonly dataApi: MXDataApiService,
        private readonly apiService: MXApiService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly contextGetter: ContextGetterService,
        @InjectModel(StateSnapshot.name)
        private readonly snapshotModel: Model<StateSnapshotDocument>,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.bulkUpdatesService = new BulkUpdatesService();
    }

    async getLatestSnapshot(): Promise<{
        pairs: Map<string, PairModel>;
        tokens: Map<string, EsdtToken>;
        farms: Map<string, FarmModel>;
        stakingFarms: Map<string, StakingModel>;
        stakingProxies: Map<string, StakingProxyModel>;
        feesCollector: FeesCollectorModel;
    }> {
        const pairs = new Map<string, PairModel>();
        const tokens = new Map<string, EsdtToken>();
        const farms = new Map<string, FarmModel>();
        const stakingFarms = new Map<string, StakingModel>();
        const stakingProxies = new Map<string, StakingProxyModel>();

        const snapshot = await this.snapshotModel
            .findOne({}, undefined, { lean: true })
            .sort({ date: 'desc' })
            .exec();

        if (snapshot?.pairs.length > 0) {
            snapshot.pairs.forEach((pair) => pairs.set(pair.address, pair));
        }

        if (snapshot?.tokens.length > 0) {
            snapshot.tokens.forEach((token) =>
                tokens.set(token.identifier, token),
            );
        }

        if (snapshot?.farms?.length > 0) {
            snapshot.farms.forEach((farm) => farms.set(farm.address, farm));
        }

        if (snapshot?.stakingFarms?.length > 0) {
            snapshot.stakingFarms.forEach((stakingFarm) =>
                stakingFarms.set(stakingFarm.address, stakingFarm),
            );
        }

        if (snapshot?.stakingProxies?.length > 0) {
            snapshot.stakingProxies.forEach((stakingProxy) =>
                stakingProxies.set(stakingProxy.address, stakingProxy),
            );
        }

        const feesCollector: FeesCollectorModel =
            snapshot?.feesCollector ?? undefined;

        return {
            pairs,
            tokens,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
        };
    }

    async updateSnapshot(
        pairs: PairModel[],
        tokens: EsdtToken[],
        farms: FarmModel[],
        stakingFarms: StakingModel[],
        stakingProxies: StakingProxyModel[],
        feesCollector: FeesCollectorModel,
    ): Promise<UpdateWriteOpResult> {
        const date = moment().utc().startOf('day').toDate();
        const blockNonce = await this.contextGetter.getShardCurrentBlockNonce(
            1,
        );

        try {
            const result = await this.snapshotModel
                .updateOne(
                    {
                        date,
                        $or: [
                            { blockNonce: { $lte: blockNonce } },
                            { blockNonce: { $exists: false } },
                        ],
                    },
                    {
                        $set: {
                            pairs,
                            tokens,
                            farms,
                            stakingFarms,
                            stakingProxies,
                            feesCollector,
                            blockNonce,
                        },
                    },
                    {
                        upsert: true,
                    },
                )
                .exec();

            return result;
        } catch (error) {
            if (error.name === MongoServerError.name && error.code === 11000) {
                this.logger.warn('Duplicate snapshot', {
                    context: StateSyncService.name,
                    date,
                    blockNonce,
                });

                return {
                    acknowledged: true,
                    matchedCount: 0,
                    modifiedCount: 0,
                    upsertedCount: 0,
                    upsertedId: null,
                };
            } else {
                throw error;
            }
        }
    }

    async populateState(): Promise<{
        tokens: EsdtToken[];
        pairs: PairModel[];
        farms: FarmModel[];
        stakingFarms: StakingModel[];
        stakingProxies: StakingProxyModel[];
        feesCollector: FeesCollectorModel;
        commonTokenIDs: string[];
        usdcPrice: number;
    }> {
        this.logger.info(`Starting ${this.populateState.name}`, {
            context: StateSyncService.name,
        });
        const profiler = new PerformanceProfiler();

        const tokens = new Map<string, EsdtToken>();
        const pairs = new Map<string, PairModel>();

        const [
            pairsMetadata,
            commonTokenIDs,
            usdcPrice,
            currentEpoch,
            {
                pairs: snapshotPairs,
                tokens: snapshotTokens,
                farms: snapshotFarms,
                stakingFarms: snapshotStakingFarms,
                stakingProxies: snapshotStakingProxies,
                feesCollector: snapshotFeesCollector,
            },
        ] = await Promise.all([
            this.routerAbi.getPairsMetadataRaw(),
            this.routerAbi.commonTokensForUserPairs(),
            this.getUsdcPrice(),
            this.contextGetter.getCurrentEpoch(),
            this.getLatestSnapshot(),
        ]);

        const pairsNeedingAnalytics: string[] = [];
        const tokensNeedingAnalytics: string[] = [];
        for (const pairMeta of pairsMetadata) {
            if (
                snapshotPairs.has(pairMeta.address) &&
                snapshotTokens.has(pairMeta.firstTokenID) &&
                snapshotTokens.has(pairMeta.secondTokenID)
            ) {
                const snapshotPair = snapshotPairs.get(pairMeta.address);

                pairs.set(pairMeta.address, { ...snapshotPair });
                tokens.set(pairMeta.firstTokenID, {
                    ...snapshotTokens.get(pairMeta.firstTokenID),
                });
                tokens.set(pairMeta.secondTokenID, {
                    ...snapshotTokens.get(pairMeta.secondTokenID),
                });

                if (snapshotPair.liquidityPoolTokenId) {
                    tokens.set(snapshotPair.liquidityPoolTokenId, {
                        ...snapshotTokens.get(
                            snapshotPair.liquidityPoolTokenId,
                        ),
                    });
                }

                continue;
            }

            const pair = await this.populatePair(pairMeta, currentEpoch);

            if (!tokens.has(pair.firstTokenId)) {
                const firstToken = await this.populateToken(pair.firstTokenId);

                if (firstToken === undefined) {
                    throw new Error(
                        `Could not get first token ${pair.firstTokenId} for pair ${pairMeta.address}`,
                    );
                }

                tokens.set(firstToken.identifier, { ...firstToken });
            }

            if (!tokens.has(pair.secondTokenId)) {
                const secondToken = await this.populateToken(
                    pair.secondTokenId,
                );

                if (secondToken === undefined) {
                    throw new Error(
                        `Could not get second token ${pair.secondTokenId} for pair ${pairMeta.address}`,
                    );
                }

                tokens.set(secondToken.identifier, { ...secondToken });
            }

            if (
                pair.liquidityPoolTokenId &&
                !tokens.has(pair.liquidityPoolTokenId)
            ) {
                const lpToken = await this.populateToken(
                    pair.liquidityPoolTokenId,
                    pair.address,
                );

                if (lpToken === undefined) {
                    throw new Error(
                        `Could not get LP token ${pair.liquidityPoolTokenId} for pair ${pairMeta.address}`,
                    );
                }

                tokens.set(lpToken.identifier, { ...lpToken });
            }

            pairs.set(pair.address, { ...pair });

            pairsNeedingAnalytics.push(pair.address);
            tokensNeedingAnalytics.push(pair.firstTokenId, pair.secondTokenId);
        }

        this.bulkUpdatesService.recomputeAllValues(
            pairs,
            tokens,
            usdcPrice,
            commonTokenIDs,
        );

        const farms = new Map<string, FarmModel>();
        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        for (const farmAddress of farmAddresses) {
            if (snapshotFarms.has(farmAddress)) {
                const snapshotFarm = snapshotFarms.get(farmAddress);
                farms.set(farmAddress, { ...snapshotFarm });

                continue;
            }

            const farm = await this.populateFarm(farmAddress);

            farms.set(farm.address, { ...farm });
        }

        const stakingAddresses =
            await this.remoteConfigGetter.getStakingAddresses();
        const stakingFarms = new Map<string, StakingModel>();

        for (const stakingAddress of stakingAddresses) {
            if (snapshotStakingFarms.has(stakingAddress)) {
                const snapshotStakingFarm =
                    snapshotStakingFarms.get(stakingAddress);
                stakingFarms.set(stakingAddress, { ...snapshotStakingFarm });

                continue;
            }

            const stakingFarm = await this.populateStakingFarm(stakingAddress);

            stakingFarms.set(stakingAddress, { ...stakingFarm });
        }

        const stakingProxyAddresses =
            await this.remoteConfigGetter.getStakingProxyAddresses();
        const stakingProxies = new Map<string, StakingProxyModel>();

        for (const stakingProxyAddress of stakingProxyAddresses) {
            if (snapshotStakingProxies.has(stakingProxyAddress)) {
                const snapshotStakingProxy =
                    snapshotStakingProxies.get(stakingProxyAddress);
                stakingProxies.set(stakingProxyAddress, {
                    ...snapshotStakingProxy,
                });

                continue;
            }

            const stakingProxy = await this.populateStakingProxy(
                stakingProxyAddress,
            );

            stakingProxies.set(stakingProxyAddress, { ...stakingProxy });
        }

        const feesCollector =
            snapshotFeesCollector ?? (await this.populateFeesCollector());

        // await this.updatePairsAnalytics(pairs, pairsNeedingAnalytics);

        // await this.updateTokensAnalytics(tokens, tokensNeedingAnalytics);

        profiler.stop();

        this.logger.debug(
            `${this.populateState.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
            },
        );

        return {
            tokens: [...tokens.values()],
            pairs: [...pairs.values()],
            farms: [...farms.values()],
            stakingFarms: [...stakingFarms.values()],
            stakingProxies: [...stakingProxies.values()],
            feesCollector,
            commonTokenIDs,
            usdcPrice,
        };
    }

    async addPair(
        pairMetadata: PairMetadata,
        timestamp?: number,
    ): Promise<{
        pair: PairModel;
        firstToken: EsdtToken;
        secondToken: EsdtToken;
    }> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        const pair = await this.populatePair(
            pairMetadata,
            currentEpoch,
            timestamp,
        );

        const { firstTokenId, secondTokenId } = pair;

        const [firstToken, secondToken] = await Promise.all([
            this.populateToken(firstTokenId),
            this.populateToken(secondTokenId),
        ]);

        if (firstToken === undefined || secondToken === undefined) {
            throw new Error(
                `Could not get tokens ${firstTokenId}/${secondTokenId} for pair ${pair.address}`,
            );
        }

        pair.firstTokenVolume24h = '0';
        pair.secondTokenVolume24h = '0';
        pair.volumeUSD24h = '0';
        pair.previous24hVolumeUSD = '0';
        pair.feesUSD24h = '0';
        pair.previous24hFeesUSD = '0';
        pair.previous24hLockedValueUSD = '0';
        pair.tradesCount = 0;
        pair.tradesCount24h = 0;
        pair.feesAPR = '0';
        pair.compoundedAprValue = '0';
        pair.hasFarms = false;
        pair.hasDualFarms = false;

        firstToken.volumeUSD24h = '0';
        firstToken.previous24hVolume = '0';
        firstToken.previous24hPrice = '0';
        firstToken.previous7dPrice = '0';
        firstToken.swapCount24h = 0;
        firstToken.previous24hSwapCount = 0;
        firstToken.volumeUSDChange24h = 0;
        firstToken.priceChange24h = 0;
        firstToken.priceChange7d = 0;
        firstToken.tradeChange24h = 0;
        firstToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        secondToken.volumeUSD24h = '0';
        secondToken.previous24hVolume = '0';
        secondToken.previous24hPrice = '0';
        secondToken.previous7dPrice = '0';
        secondToken.swapCount24h = 0;
        secondToken.previous24hSwapCount = 0;
        secondToken.volumeUSDChange24h = 0;
        secondToken.priceChange24h = 0;
        secondToken.priceChange7d = 0;
        secondToken.tradeChange24h = 0;
        secondToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        return {
            pair,
            firstToken,
            secondToken,
        };
    }

    private async populatePair(
        pairMetadata: PairMetadata,
        currentEpoch: number,
        timestamp?: number,
    ): Promise<PairModel> {
        const profiler = new PerformanceProfiler();

        const { firstTokenID, secondTokenID, address } = pairMetadata;

        const [
            liquidityPoolTokenId,
            info,
            totalFeePercent,
            specialFeePercent,
            feesCollectorCutPercentage,
            trustedSwapPairs,
            state,
            feeState,
            whitelistedManagedAddresses,
            initialLiquidityAdder,
            feeDestinations,
            feesCollectorAddress,
            lockingScAddress,
            unlockEpoch,
            lockingDeadlineEpoch,
            deployedAt,
        ] = await Promise.all([
            this.pairAbi.getLpTokenIDRaw(address),
            this.pairAbi.getPairInfoMetadataRaw(address),
            this.pairAbi.getTotalFeePercentRaw(address),
            this.pairAbi.getSpecialFeePercentRaw(address),
            this.pairAbi.getFeesCollectorCutPercentageRaw(address),
            this.pairAbi.getTrustedSwapPairsRaw(address),
            this.pairAbi.getStateRaw(address),
            this.pairAbi.getFeeStateRaw(address),
            this.pairAbi.getWhitelistedAddressesRaw(address),
            this.pairAbi.getInitialLiquidityAdderRaw(address),
            this.pairAbi.getFeeDestinationsRaw(address),
            this.pairAbi.getFeesCollectorAddressRaw(address),
            this.pairAbi.getLockingScAddressRaw(address),
            this.pairAbi.getUnlockEpochRaw(address),
            this.pairAbi.getLockingDeadlineEpochRaw(address),
            this.pairCompute.computeDeployedAt(address),
        ]);

        let lockedTokensInfo: LockedTokensInfo;

        if (
            lockingScAddress !== undefined &&
            unlockEpoch !== undefined &&
            lockingDeadlineEpoch !== undefined &&
            currentEpoch < lockingDeadlineEpoch
        ) {
            lockedTokensInfo = new LockedTokensInfo({
                lockingScAddress: lockingScAddress,
                unlockEpoch,
                lockingDeadlineEpoch,
            });
        }

        const pair: Partial<PairModel> = {
            address,
            firstTokenId: firstTokenID,
            secondTokenId: secondTokenID,
            ...(liquidityPoolTokenId && { liquidityPoolTokenId }),
            info,
            totalFeePercent: new BigNumber(totalFeePercent)
                .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                .toNumber(),
            specialFeePercent: new BigNumber(specialFeePercent)
                .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                .toNumber(),
            feesCollectorCutPercentage:
                feesCollectorCutPercentage /
                constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS,
            trustedSwapPairs,
            state,
            feeState,
            whitelistedManagedAddresses,
            initialLiquidityAdder,
            feeDestinations,
            feesCollectorAddress,
            lockedTokensInfo,
            deployedAt: deployedAt ?? timestamp ?? 0,
        };

        profiler.stop();

        this.logger.debug(
            `${this.populatePair.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
                address,
                tokens: `${firstTokenID}/${secondTokenID}`,
            },
        );

        return pair as PairModel;
    }

    async populateToken(
        tokenID: string,
        pairAddress?: string,
    ): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }

        const [tokenMetadata, tokenCreatedAt] = await Promise.all([
            this.apiService.getToken(tokenID),
            this.tokenCompute.computeTokenCreatedAtTimestamp(tokenID),
        ]);

        if (tokenMetadata === undefined) {
            return undefined;
        }

        const token: Partial<EsdtToken> = {
            ...this.getTokenFromMetadata(tokenMetadata),
            ...(pairAddress && { pairAddress }),
            type: pairAddress
                ? EsdtTokenType.FungibleLpToken
                : EsdtTokenType.FungibleToken,
            createdAt: tokenCreatedAt,
        };

        if (token.assets) {
            token.assets.lockedAccounts = token.assets.lockedAccounts
                ? Object.keys(token.assets.lockedAccounts)
                : [];
        }

        return token as EsdtToken;
    }

    async populateFarm(address: string): Promise<FarmModel> {
        const profiler = new PerformanceProfiler();

        const [
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            produceRewardsEnabled,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs,
            energyFactoryAddress,
            farmTokenSupply,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            pairAddress,
            lastGlobalUpdateWeek,
            currentWeek,
            firstWeekStartEpoch,
        ] = await Promise.all([
            this.farmAbiV2.getFarmingTokenIDRaw(address),
            this.farmAbiV2.getFarmedTokenIDRaw(address),
            this.farmAbiV2.getFarmTokenIDRaw(address),
            this.farmAbiV2.getProduceRewardsEnabledRaw(address),
            this.farmAbiV2.getRewardsPerBlockRaw(address),
            this.farmAbiV2.getPenaltyPercentRaw(address),
            this.farmAbiV2.getMinimumFarmingEpochsRaw(address),
            this.farmAbiV2.getDivisionSafetyConstantRaw(address),
            this.farmAbiV2.getStateRaw(address),
            this.farmAbiV2.getBurnGasLimitRaw(address),
            this.farmAbiV2.getBoostedYieldsRewardsPercenatageRaw(address),
            this.farmAbiV2.getBoostedYieldsFactorsRaw(address),
            this.farmAbiV2.getLockingScAddressRaw(address),
            this.farmAbiV2.getLockEpochsRaw(address),
            this.farmAbiV2.getEnergyFactoryAddressRaw(address),
            this.farmAbiV2.getFarmTokenSupplyRaw(address),
            this.farmAbiV2.getLastRewardBlockNonceRaw(address),
            this.farmAbiV2.getRewardPerShareRaw(address),
            this.farmAbiV2.getRewardReserveRaw(address),
            this.farmAbiV2.getPairContractAddressRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
        ]);

        const [
            boosterRewards,
            farmTokenMetadata,
            farmTokenSupplyCurrentWeek,
            accumulatedRewards,
            undistributedBoostedRewards,
        ] = await Promise.all([
            this.getGlobalInfoWeeklyModels(address, currentWeek),
            this.apiService.getNftCollection(farmTokenCollection),
            this.farmAbiV2.getFarmSupplyForWeekRaw(address, currentWeek),
            this.farmAbiV2.getAccumulatedRewardsForWeekRaw(
                address,
                currentWeek,
            ),
            this.farmComputeV2.undistributedBoostedRewardsRaw(
                address,
                currentWeek,
            ),
        ]);

        const farm = new FarmModel({
            address,
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            farmTokenDecimals: farmTokenMetadata.decimals,
            farmTokenSupply,
            farmTokenSupplyCurrentWeek,
            pairAddress,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            boosterRewards,
            produceRewardsEnabled,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercenatage: boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs: lockEpochs.toString(),
            energyFactoryAddress,
            rewardType: farmType(address),
            time: new WeekTimekeepingModel({
                currentWeek,
                firstWeekStartEpoch,
            }),
            lastGlobalUpdateWeek,
            accumulatedRewards,
            undistributedBoostedRewards: undistributedBoostedRewards
                .integerValue()
                .toFixed(),
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateFarm.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
                address,
                tokens: [farmingTokenId, farmedTokenId, farmTokenCollection],
            },
        );

        return farm;
    }

    async populateStakingFarm(address: string): Promise<StakingModel> {
        const profiler = new PerformanceProfiler();

        const [
            farmTokenCollection,
            farmingTokenId,
            rewardTokenId,
            farmTokenSupply,
            rewardPerShare,
            accumulatedRewards,
            rewardCapacity,
            annualPercentageRewards,
            perBlockRewards,
            minUnboundEpochs,
            lastRewardBlockNonce,
            divisionSafetyConstant,
            produceRewardsEnabled,
            lockedAssetFactoryManagedAddress,
            state,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            energyFactoryAddress,
            stakingPositionMigrationNonce,
            deployedAt,
            currentWeek,
            firstWeekStartEpoch,
            lastGlobalUpdateWeek,
        ] = await Promise.all([
            this.stakingAbi.getFarmTokenIDRaw(address),
            this.stakingAbi.getFarmingTokenIDRaw(address),
            this.stakingAbi.getRewardTokenIDRaw(address),
            this.stakingAbi.getFarmTokenSupplyRaw(address),
            this.stakingAbi.getRewardPerShareRaw(address),
            this.stakingAbi.getAccumulatedRewardsRaw(address),
            this.stakingAbi.getRewardCapacityRaw(address),
            this.stakingAbi.getAnnualPercentageRewardsRaw(address),
            this.stakingAbi.getPerBlockRewardsAmountRaw(address),
            this.stakingAbi.getMinUnbondEpochsRaw(address),
            this.stakingAbi.getLastRewardBlockNonceRaw(address),
            this.stakingAbi.getDivisionSafetyConstantRaw(address),
            this.stakingAbi.getProduceRewardsEnabledRaw(address),
            this.stakingAbi.getLockedAssetFactoryAddressRaw(address),
            this.stakingAbi.getStateRaw(address),
            this.stakingAbi.getBoostedYieldsRewardsPercenatageRaw(address),
            this.stakingAbi.getBoostedYieldsFactorsRaw(address),
            this.stakingAbi.getEnergyFactoryAddressRaw(address),
            this.stakingAbi.getFarmPositionMigrationNonceRaw(address),
            this.stakingCompute.computeDeployedAt(address),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
        ]);

        const [
            boosterRewards,
            farmTokenMetadata,
            farmTokenSupplyCurrentWeek,
            accumulatedRewardsForWeek,
            undistributedBoostedRewards,
        ] = await Promise.all([
            this.getGlobalInfoWeeklyModels(address, currentWeek),
            this.apiService.getNftCollection(farmTokenCollection),
            this.stakingAbi.getFarmSupplyForWeekRaw(address, currentWeek),
            this.stakingAbi.getAccumulatedRewardsForWeekRaw(
                address,
                currentWeek,
            ),
            this.stakingCompute.undistributedBoostedRewardsRaw(
                address,
                currentWeek,
            ),
        ]);

        const stakingFarm = new StakingModel({
            address,
            farmTokenCollection,
            farmTokenDecimals: farmTokenMetadata.decimals,
            farmingTokenId,
            rewardTokenId,
            farmTokenSupply,
            rewardPerShare,
            accumulatedRewards,
            rewardCapacity,
            annualPercentageRewards,
            minUnboundEpochs,
            perBlockRewards,
            lastRewardBlockNonce,
            divisionSafetyConstant: divisionSafetyConstant.toString(),
            produceRewardsEnabled,
            lockedAssetFactoryManagedAddress,
            state,
            boostedYieldsRewardsPercenatage: boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            time: new WeekTimekeepingModel({
                currentWeek,
                firstWeekStartEpoch,
            }),
            boosterRewards,
            lastGlobalUpdateWeek,
            farmTokenSupplyCurrentWeek,
            energyFactoryAddress,
            accumulatedRewardsForWeek,
            undistributedBoostedRewards: undistributedBoostedRewards
                .integerValue()
                .toFixed(),
            stakingPositionMigrationNonce,
            deployedAt,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateStakingFarm.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
                address,
                tokens: [farmingTokenId, rewardTokenId, farmTokenCollection],
            },
        );

        return stakingFarm;
    }

    async populateStakingProxy(address: string): Promise<StakingProxyModel> {
        const profiler = new PerformanceProfiler();

        const [
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingTokenId,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        ] = await Promise.all([
            this.stakingProxyAbi.getlpFarmAddressRaw(address),
            this.stakingProxyAbi.getStakingFarmAddressRaw(address),
            this.stakingProxyAbi.getPairAddressRaw(address),
            this.stakingProxyAbi.getStakingTokenIDRaw(address),
            this.stakingProxyAbi.getFarmTokenIDRaw(address),
            this.stakingProxyAbi.getDualYieldTokenIDRaw(address),
            this.stakingProxyAbi.getLpFarmTokenIDRaw(address),
        ]);

        const stakingProxy = new StakingProxyModel({
            address,
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingTokenId,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateStakingProxy.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
                address,
            },
        );

        return stakingProxy;
    }

    async populateFeesCollector(): Promise<FeesCollectorModel> {
        const profiler = new PerformanceProfiler();

        const address = scAddress.feesCollector;

        const [
            allTokens,
            knownContracts,
            lockedTokensPerEpoch,
            lastLockedTokensAddWeek,
            lockedTokenId,
            currentWeek,
            firstWeekStartEpoch,
            lastGlobalUpdateWeek,
            stats,
            currentEpoch,
        ] = await Promise.all([
            this.feesCollectorAbi.getAllTokensRaw(),
            this.feesCollectorAbi.getKnownContractsRaw(),
            this.feesCollectorAbi.getLockedTokensPerEpochRaw(),
            this.feesCollectorAbi.getLastLockedTokensAddWeekRaw(),
            this.energyAbi.lockedTokenID(),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
            this.apiService.getStats(),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const startEpochForWeek =
            firstWeekStartEpoch +
            (currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
        const endEpochForWeek =
            startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;

        const time = new WeekTimekeepingModel({
            currentWeek,
            firstWeekStartEpoch,
            startEpochForWeek,
            endEpochForWeek,
        });

        const [
            undistributedRewards,
            blocksInWeek,
            accumulatedFees,
            rewardsClaimed,
        ] = await Promise.all([
            this.getGlobalInfoWeeklyModels(address, currentWeek),
            this.getBlocksInWeek(currentEpoch, time),
            this.getFeesCollectorAccumulatedFees(currentWeek, allTokens),
            this.getFeesCollectorRewardsClaimed(currentWeek, allTokens),
        ]);

        const lockedTokensPerBlock = new BigNumber(lockedTokensPerEpoch)
            .dividedBy(stats.roundsPerEpoch)
            .integerValue()
            .toFixed();

        const accumulatedFeesUntilNow = new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();

        accumulatedFees.push(
            new EsdtTokenPayment({
                tokenID: `Minted${lockedTokenId}`,
                tokenType: 0,
                amount: accumulatedFeesUntilNow,
                nonce: 0,
            }),
        );

        const feesCollector = new FeesCollectorModel({
            address,
            time,
            startWeek: currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: currentWeek,
            lastGlobalUpdateWeek,
            undistributedRewards,
            allTokens,
            knownContracts,
            accumulatedFees,
            rewardsClaimed,
            lockedTokenId,
            lockedTokensPerBlock,
            lockedTokensPerEpoch,
            lastLockedTokensAddWeek,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateFeesCollector.name} : ${profiler.duration}ms`,
            {
                context: StateSyncService.name,
            },
        );

        return feesCollector;
    }

    private async getFeesCollectorRewardsClaimed(
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const claimAmounts = await Promise.all(
            allTokens.map((token) =>
                this.feesCollectorAbi.getRewardsClaimedRaw(week, token),
            ),
        );

        return allTokens.map(
            (token, index) =>
                new EsdtTokenPayment({
                    tokenID: token,
                    tokenType: 0,
                    amount: claimAmounts[index],
                    nonce: 0,
                }),
        );
    }

    private async getFeesCollectorAccumulatedFees(
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const accumulatedFeesByToken = await Promise.all(
            allTokens.map((token) =>
                this.feesCollectorAbi.getAccumulatedFeesRaw(week, token),
            ),
        );

        return accumulatedFeesByToken.map(
            (accumulatedFee, index) =>
                new EsdtTokenPayment({
                    tokenID: allTokens[index],
                    tokenType: 0,
                    amount: accumulatedFee,
                    nonce: 0,
                }),
        );
    }

    private async getBlocksInWeek(
        currentEpoch: number,
        time: WeekTimekeepingModel,
    ): Promise<number> {
        const promises = [];
        for (
            let epoch = time.startEpochForWeek;
            epoch <= currentEpoch;
            epoch++
        ) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch, 1));
        }

        const blocksInEpoch = await Promise.all(promises);

        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        });
    }

    async getGlobalInfoWeeklyModels(
        address: string,
        currentWeek: number,
    ): Promise<GlobalInfoByWeekModel[]> {
        const result: GlobalInfoByWeekModel[] = [];
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }

            const [
                totalRewardsForWeek,
                totalEnergyForWeek,
                totalLockedTokensForWeek,
            ] = await Promise.all([
                this.weeklyRewardsSplittingAbi.totalRewardsForWeekRaw(
                    address,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeekRaw(
                    address,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalLockedTokensForWeekRaw(
                    address,
                    week,
                ),
            ]);

            result.push(
                new GlobalInfoByWeekModel({
                    week,
                    totalRewardsForWeek,
                    totalEnergyForWeek,
                    totalLockedTokensForWeek,
                }),
            );
        }

        return result;
    }

    async indexPairLpToken(address: string): Promise<EsdtToken> {
        const lpTokenId = await this.pairAbi.getLpTokenIDRaw(address);

        if (lpTokenId === undefined) {
            return undefined;
        }

        const lpToken = await this.populateToken(lpTokenId, address);

        if (lpToken == undefined) {
            return undefined;
        }

        lpToken.volumeUSD24h = '0';
        lpToken.previous24hVolume = '0';
        lpToken.previous24hPrice = '0';
        lpToken.previous7dPrice = '0';
        lpToken.swapCount24h = 0;
        lpToken.previous24hSwapCount = 0;
        lpToken.volumeUSDChange24h = 0;
        lpToken.priceChange24h = 0;
        lpToken.priceChange7d = 0;
        lpToken.tradeChange24h = 0;
        lpToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        return lpToken;
    }

    async getPairReservesAndState(
        pair: PairModel,
    ): Promise<Partial<PairModel>> {
        const [info, state] = await Promise.all([
            this.pairAbi.getPairInfoMetadataRaw(pair.address),
            this.pairAbi.getStateRaw(pair.address),
        ]);

        const pairUpdates: Partial<PairModel> = {
            info,
            state,
        };

        return pairUpdates;
    }

    async getUsdcPrice(): Promise<number> {
        return this.dataApi.getTokenPrice('USDC');
    }

    async getPairAnalytics(pair: PairModel): Promise<Partial<PairModel>> {
        const [
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            previous24hVolumeUSD,
            feesUSD24h,
            previous24hFeesUSD,
            previous24hLockedValueUSD,
            tradesCount,
            tradesCount24h,
            // hasFarms,
            // hasDualFarms,
            // compoundedAprValue,
        ] = await Promise.all([
            this.pairCompute.firstTokenVolume(pair.address),
            this.pairCompute.secondTokenVolume(pair.address),
            this.pairCompute.volumeUSD(pair.address),
            this.pairCompute.previous24hVolumeUSD(pair.address),
            this.pairCompute.feesUSD(pair.address, '24h'),
            this.pairCompute.previous24hFeesUSD(pair.address),
            this.pairCompute.previous24hLockedValueUSD(pair.address),
            this.pairCompute.tradesCount(pair.address),
            this.pairCompute.tradesCount24h(pair.address),
            // this.pairCompute.hasFarms(pair.address),
            // this.pairCompute.hasDualFarms(pair.address),
            // this.pairCompute.computeCompoundedApr(pair.address),
        ]);

        const actualFees24hBig = new BigNumber(feesUSD24h).multipliedBy(
            new BigNumber(pair.totalFeePercent - pair.specialFeePercent).div(
                pair.totalFeePercent,
            ),
        );
        const feesAPR = actualFees24hBig.times(365).div(pair.lockedValueUSD);

        const pairUpdates: Partial<PairModel> = {
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            previous24hVolumeUSD,
            feesUSD24h,
            previous24hFeesUSD,
            previous24hLockedValueUSD,
            tradesCount,
            tradesCount24h,
            feesAPR: feesAPR.isNaN() ? '0' : feesAPR.toFixed(),
            // hasFarms,
            // hasDualFarms,
            // compoundedAprValue: '0',
        };

        return pairUpdates;
    }

    async updateTokensAnalytics(
        tokens: Map<string, EsdtToken>,
        tokensNeedingAnalytics: string[],
    ): Promise<void> {
        const wegldToken = tokens.get(tokenProviderUSD);
        if (!wegldToken) {
            throw new Error(
                `Missing token provider in state. Cannot refresh analytics`,
            );
        }

        const [
            wrappedEGLDPrev24hPrice,
            allTokensSwapsCount,
            allTokensSwapsCountPrevious24h,
        ] = await Promise.all([
            this.computeTokenPrevious24hPrice(
                wegldToken,
                wegldToken.previous24hPrice,
            ),
            this.tokenCompute.allTokensSwapsCount(),
            this.tokenCompute.allTokensSwapsCountPrevious24h(),
        ]);

        const swapCountMap = new Map(
            allTokensSwapsCount.map(({ tokenID, swapsCount }) => [
                tokenID,
                swapsCount,
            ]),
        );

        const previous24hSwapCountMap = new Map(
            allTokensSwapsCountPrevious24h.map(({ tokenID, swapsCount }) => [
                tokenID,
                swapsCount,
            ]),
        );

        for (const tokenID of tokensNeedingAnalytics) {
            const token = tokens.get(tokenID);
            if (token.type === EsdtTokenType.FungibleLpToken) {
                continue;
            }

            const [volumeLast2Days, previous24hPrice, previous7dPrice] =
                await Promise.all([
                    this.tokenCompute.tokenLast2DaysVolumeUSD(token.identifier),
                    this.computeTokenPrevious24hPrice(
                        token,
                        wrappedEGLDPrev24hPrice,
                    ),
                    this.tokenCompute.tokenPrevious7dPrice(token.identifier),
                ]);

            token.volumeUSD24h = volumeLast2Days.current;
            token.previous24hVolume = volumeLast2Days.previous;
            token.previous24hPrice = previous24hPrice;
            token.previous7dPrice = previous7dPrice ?? '0';
            token.swapCount24h = swapCountMap.get(token.identifier) ?? 0;
            token.previous24hSwapCount =
                previous24hSwapCountMap.get(token.identifier) ?? 0;
            token.volumeUSDChange24h = this.computeTokenVolumeChange(token);
            token.priceChange24h = this.computeTokenPriceChange(token, '24h');
            token.priceChange7d = this.computeTokenPriceChange(token, '7d');
            token.tradeChange24h = this.computeTokenTradeChange24h(token);
            token.trendingScore = this.computeTokenTrendingScore(token);
        }
    }

    private async updatePairsAnalytics(
        pairs: Map<string, PairModel>,
        pairsNeedingAnalytics: string[],
    ): Promise<void> {
        for (const address of pairsNeedingAnalytics) {
            const pair = pairs.get(address);
            const updates = await this.getPairAnalytics(pair);

            pairs.set(pair.address, {
                ...pair,
                ...updates,
            });
        }
    }

    private async computeTokenPrevious24hPrice(
        token: EsdtToken,
        wrappedEGLDPrev24hPrice: string,
    ): Promise<string> {
        const cachedValues24h = await this.cacheService.get<
            HistoricDataModel[]
        >(
            generateCacheKeyFromParams('analytics', [
                'values24h',
                token.identifier,
                'priceUSD',
            ]),
        );

        const values24h =
            !cachedValues24h || cachedValues24h === undefined
                ? await this.analyticsQuery.getValues24h({
                      series: token.identifier,
                      metric: 'priceUSD',
                  })
                : cachedValues24h;

        if (values24h.length > 0 && values24h[0]?.value === '0') {
            return new BigNumber(token.derivedEGLD)
                .times(wrappedEGLDPrev24hPrice)
                .toFixed();
        }

        return values24h[0]?.value ?? '0';
    }

    private computeTokenVolumeChange(token: EsdtToken): number {
        const currentVolumeBN = new BigNumber(token.volumeUSD24h);
        const previous24hVolumeBN = new BigNumber(token.previous24hVolume);

        if (currentVolumeBN.isZero()) {
            return 0;
        }

        const maxPrevious24hVolume = BigNumber.maximum(
            previous24hVolumeBN,
            constantsConfig.trendingScore.MIN_24H_VOLUME,
        );

        return currentVolumeBN.dividedBy(maxPrevious24hVolume).toNumber();
    }

    private computeTokenPriceChange(
        token: EsdtToken,
        period: '24h' | '7d',
    ): number {
        const currentPriceBN = new BigNumber(token.price);
        const previousPriceBN = new BigNumber(
            period === '24h' ? token.previous24hPrice : token.previous7dPrice,
        );

        if (previousPriceBN.isZero()) {
            return 0;
        }

        return currentPriceBN.dividedBy(previousPriceBN).toNumber();
    }

    private computeTokenTradeChange24h(token: EsdtToken): number {
        const currentSwapsBN = new BigNumber(token.swapCount24h);
        const previous24hSwapsBN = new BigNumber(token.previous24hSwapCount);

        const maxPrevious24hTradeCount = BigNumber.maximum(
            previous24hSwapsBN,
            constantsConfig.trendingScore.MIN_24H_TRADE_COUNT,
        );

        return currentSwapsBN.dividedBy(maxPrevious24hTradeCount).toNumber();
    }

    private computeTokenTrendingScore(token: EsdtToken): string {
        const { volumeUSDChange24h, priceChange24h, tradeChange24h } = token;

        const volumeScore = new BigNumber(
            constantsConfig.trendingScore.VOLUME_WEIGHT,
        ).multipliedBy(
            volumeUSDChange24h > 0
                ? Math.log(volumeUSDChange24h)
                : MIN_TRENDING_SCORE,
        );
        const priceScore = new BigNumber(
            constantsConfig.trendingScore.PRICE_WEIGHT,
        ).multipliedBy(
            priceChange24h > 0 ? Math.log(priceChange24h) : MIN_TRENDING_SCORE,
        );
        const tradeScore = new BigNumber(
            constantsConfig.trendingScore.TRADES_COUNT_WEIGHT,
        ).multipliedBy(
            tradeChange24h > 0 ? Math.log(tradeChange24h) : MIN_TRENDING_SCORE,
        );

        const trendingScore = volumeScore.plus(priceScore).plus(tradeScore);

        return trendingScore.toFixed();
    }

    private getTokenFromMetadata(tokenMetadata: EsdtToken): Partial<EsdtToken> {
        const token: Partial<EsdtToken> = {
            identifier: tokenMetadata.identifier,
            decimals: tokenMetadata.decimals,
            name: tokenMetadata.name,
            ticker: tokenMetadata.ticker,
            owner: tokenMetadata.owner,
            minted: tokenMetadata.minted,
            burnt: tokenMetadata.burnt,
            initialMinted: tokenMetadata.initialMinted,
            supply: tokenMetadata.supply,
            circulatingSupply: tokenMetadata.circulatingSupply,
            assets: tokenMetadata.assets,
            transactions: tokenMetadata.transactions,
            accounts: tokenMetadata.accounts,
            isPaused: tokenMetadata.isPaused,
            canUpgrade: tokenMetadata.canUpgrade,
            canMint: tokenMetadata.canMint,
            canBurn: tokenMetadata.canBurn,
            canChangeOwner: tokenMetadata.canChangeOwner,
            canPause: tokenMetadata.canPause,
            canFreeze: tokenMetadata.canFreeze,
            canWipe: tokenMetadata.canWipe,
            roles: tokenMetadata.roles,
        };
        return token;
    }
}
