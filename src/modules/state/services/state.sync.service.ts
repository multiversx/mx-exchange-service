import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { BulkUpdatesService } from 'src/microservices/dex-state/services/bulk.updates.service';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { farmsAddresses } from 'src/utils/farm.utils';
import { InitStateRequest } from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { StateSnapshotService } from './state.snapshot.service';
import { PairsSyncService } from './sync/pairs.sync.service';
import { TokensSyncService } from './sync/tokens.sync.service';
import { FarmsSyncService } from './sync/farms.sync.service';
import { StakingSyncService } from './sync/staking.sync.service';
import { FeesCollectorSyncService } from './sync/fees-collector.sync.service';
import { AnalyticsSyncService } from './sync/analytics.sync.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WeeklyRewardsSyncService } from './sync/weekly-rewards.sync.service';

@Injectable()
export class StateSyncService {
    private readonly bulkUpdatesService: BulkUpdatesService;

    constructor(
        private readonly stateSnapshot: StateSnapshotService,
        private readonly pairsSync: PairsSyncService,
        private readonly tokensSync: TokensSyncService,
        private readonly farmsSync: FarmsSyncService,
        private readonly stakingSync: StakingSyncService,
        private readonly feesCollectorSync: FeesCollectorSyncService,
        private readonly analyticsSync: AnalyticsSyncService,
        private readonly weeklyRewardsSync: WeeklyRewardsSyncService,
        private readonly routerAbi: RouterAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
        private readonly contextGetter: ContextGetterService,
        private readonly dataApi: MXDataApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.bulkUpdatesService = new BulkUpdatesService();
    }

    async populateState(): Promise<InitStateRequest> {
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
            lockedTokenCollection,
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
            this.energyAbi.lockedTokenID(),
            this.stateSnapshot.getLatestSnapshot(),
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

            const pair = await this.pairsSync.populatePair(
                pairMeta,
                currentEpoch,
            );

            if (!tokens.has(pair.firstTokenId)) {
                const firstToken = await this.tokensSync.populateToken(
                    pair.firstTokenId,
                );

                if (firstToken === undefined) {
                    throw new Error(
                        `Could not get first token ${pair.firstTokenId} for pair ${pairMeta.address}`,
                    );
                }

                tokens.set(firstToken.identifier, { ...firstToken });
            }

            if (!tokens.has(pair.secondTokenId)) {
                const secondToken = await this.tokensSync.populateToken(
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
                const lpToken = await this.tokensSync.populateToken(
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

        const farms = new Map<string, FarmModelV2>();
        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        for (const farmAddress of farmAddresses) {
            if (snapshotFarms.has(farmAddress)) {
                const snapshotFarm = snapshotFarms.get(farmAddress);
                farms.set(farmAddress, { ...snapshotFarm });

                continue;
            }

            const farm = await this.farmsSync.populateFarm(farmAddress);

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

            const stakingFarm = await this.stakingSync.populateStakingFarm(
                stakingAddress,
            );

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

            const stakingProxy = await this.stakingSync.populateStakingProxy(
                stakingProxyAddress,
            );

            stakingProxies.set(stakingProxyAddress, { ...stakingProxy });
        }

        const feesCollector =
            snapshotFeesCollector ??
            (await this.feesCollectorSync.populateFeesCollector());

        await this.analyticsSync.updatePairsAnalytics(
            pairs,
            pairsNeedingAnalytics,
        );

        await this.analyticsSync.updateTokensAnalytics(
            tokens,
            tokensNeedingAnalytics,
        );

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
            lockedTokenCollection,
        };
    }

    async getUsdcPrice(): Promise<number> {
        return this.dataApi.getTokenPrice('USDC');
    }

    async populatePairAndTokens(
        pairMetadata: PairMetadata,
        timestamp?: number,
    ): Promise<{
        pair: PairModel;
        firstToken: EsdtToken;
        secondToken: EsdtToken;
    }> {
        return this.pairsSync.populatePairAndTokens(pairMetadata, timestamp);
    }

    async indexPairLpToken(address: string): Promise<EsdtToken | undefined> {
        return this.pairsSync.indexPairLpToken(address);
    }

    async getPairReservesAndState(
        pair: PairModel,
    ): Promise<Partial<PairModel>> {
        return this.pairsSync.getPairReservesAndState(pair);
    }

    async getPairAnalytics(pair: PairModel): Promise<Partial<PairModel>> {
        return this.analyticsSync.getPairAnalytics(pair);
    }

    async updateTokensAnalytics(
        tokens: Map<string, EsdtToken>,
        tokensNeedingAnalytics: string[],
    ): Promise<void> {
        return this.analyticsSync.updateTokensAnalytics(
            tokens,
            tokensNeedingAnalytics,
        );
    }

    async updateSnapshot(
        pairs: PairModel[],
        tokens: EsdtToken[],
        farms: FarmModelV2[],
        stakingFarms: StakingModel[],
        stakingProxies: StakingProxyModel[],
        feesCollector: FeesCollectorModel,
    ): Promise<UpdateWriteOpResult> {
        return this.stateSnapshot.updateSnapshot(
            pairs,
            tokens,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
        );
    }

    async getFarmReservesAndWeeklyRewards(
        farm: FarmModelV2,
    ): Promise<Partial<FarmModelV2>> {
        const time = await this.weeklyRewardsSync.getWeekTimekeeping(
            farm.address,
        );

        const reservesAndRewards = await this.farmsSync.getReservesAndRewards(
            farm.address,
            time.currentWeek,
        );

        const result: Partial<FarmModelV2> = {
            time,
            ...reservesAndRewards,
        };

        return result;
    }

    async getStakingFarmReservesAndWeeklyRewards(
        stakingFarm: StakingModel,
    ): Promise<Partial<StakingModel>> {
        const time = await this.weeklyRewardsSync.getWeekTimekeeping(
            stakingFarm.address,
        );

        const reservesAndRewards = await this.stakingSync.getReservesAndRewards(
            stakingFarm.address,
            time.currentWeek,
        );

        const result: Partial<StakingModel> = {
            time,
            ...reservesAndRewards,
        };

        return result;
    }

    async getFeesCollectorFeesAndWeekyRewards(
        feesCollector: FeesCollectorModel,
    ): Promise<Partial<FeesCollectorModel>> {
        const time = await this.weeklyRewardsSync.getWeekTimekeeping(
            feesCollector.address,
        );

        const { address, allTokens, lockedTokenId, lockedTokensPerEpoch } =
            feesCollector;

        const feesAndRewards = await this.feesCollectorSync.getRewardsAndFees(
            address,
            time,
            allTokens,
            lockedTokenId,
            lockedTokensPerEpoch,
        );

        const result: Partial<FeesCollectorModel> = {
            time,
            ...feesAndRewards,
        };

        return result;
    }
}
