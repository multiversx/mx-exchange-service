import { Injectable } from '@nestjs/common';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import {
    PairCompoundedAPRModel,
    PairModel,
} from 'src/modules/pair/models/pair.model';
import { FarmRewardType } from 'src/modules/farm/models/farm.model';
import {
    InitStateRequest,
    InitStateResponse,
} from '../interfaces/dex_state.interfaces';
import { StateStore } from './state.store';
import { FarmComputeService } from './compute/farm.compute.service';
import { StakingComputeService } from './compute/staking.compute.service';
import { FeesCollectorComputeService } from './compute/fees-collector.compute.service';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';

@Injectable()
export class StateInitializationService {
    constructor(
        private readonly stateStore: StateStore,
        private readonly farmComputeService: FarmComputeService,
        private readonly stakingComputeService: StakingComputeService,
        private readonly feesCollectorComputeService: FeesCollectorComputeService,
    ) {}

    initState(request: InitStateRequest): InitStateResponse {
        const {
            tokens,
            pairs,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
            commonTokenIDs,
            usdcPrice,
            lockedTokenCollection,
        } = request;

        // Clear all existing state
        this.stateStore.clearAll();
        this.stateStore.setUsdcPrice(usdcPrice);
        this.stateStore.setCommonTokenIDs(commonTokenIDs);
        this.stateStore.setLockedTokenCollection(lockedTokenCollection);

        // Initialize tokens
        this.initializeTokens(tokens);

        // Initialize pairs and build indexes
        this.initializePairs(pairs);

        // Initialize farms with computed fields
        this.initializeFarms(farms);

        // Initialize staking farms
        this.initializeStakingFarms(stakingFarms);

        // Initialize staking proxies
        this.initializeStakingProxies(stakingProxies);

        // Initialize fees collector
        this.initializeFeesCollector(feesCollector);

        this.stateStore.setInitialized(true);

        return {
            tokensCount: this.stateStore.tokens.size,
            pairsCount: this.stateStore.pairs.size,
            farmsCount: this.stateStore.farms.size,
            stakingFarmsCount: this.stateStore.stakingFarms.size,
            stakingProxiesCount: this.stateStore.stakingProxies.size,
        };
    }

    private initializeTokens(tokens: EsdtToken[]): void {
        for (const token of tokens) {
            this.stateStore.setToken(token.identifier, { ...token });
            this.stateStore.addTokenByType(
                token.type as EsdtTokenType,
                token.identifier,
            );
        }
    }

    private initializePairs(pairs: PairModel[]): void {
        for (const pair of pairs) {
            const pairWithAPR: PairModel = {
                ...pair,
                compoundedAPR: new PairCompoundedAPRModel({
                    feesAPR: pair.feesAPR ?? '0',
                    farmBaseAPR: '0',
                    farmBoostedAPR: '0',
                    dualFarmBaseAPR: '0',
                    dualFarmBoostedAPR: '0',
                }),
            };

            this.stateStore.setPair(pair.address, pairWithAPR);

            // Build token-pair index
            this.stateStore.addTokenPair(pair.firstTokenId, pair.address);
            this.stateStore.addTokenPair(pair.secondTokenId, pair.address);

            // Track active pairs
            if (pair.state === 'Active') {
                this.stateStore.addActivePair(pair.address);
                this.stateStore.addActivePairsToken(pair.firstTokenId);
                this.stateStore.addActivePairsToken(pair.secondTokenId);
            }
        }
    }

    private initializeFarms(farms: FarmModelV2[]): void {
        for (const farm of farms) {
            const completeFarm =
                this.farmComputeService.computeMissingFarmFields(farm);

            const pair = this.stateStore.pairs.get(completeFarm.pairAddress);

            if (pair && completeFarm.rewardType !== FarmRewardType.DEPRECATED) {
                const updatedPair = { ...pair };
                updatedPair.hasFarms = true;
                updatedPair.farmAddress = completeFarm.address;
                updatedPair.farmRewardCollection =
                    this.stateStore.lockedTokenCollection;

                updatedPair.compoundedAPR.farmBaseAPR = completeFarm.baseApr;
                updatedPair.compoundedAPR.farmBoostedAPR =
                    completeFarm.boostedApr;

                this.stateStore.setPair(pair.address, updatedPair);

                this.stateStore.addFarmPair(completeFarm.address, pair.address);
            }

            this.stateStore.setFarm(completeFarm.address, { ...completeFarm });
        }
    }

    private initializeStakingFarms(stakingFarms: StakingModel[]): void {
        for (const stakingFarm of stakingFarms) {
            const completeStakingFarm =
                this.stakingComputeService.computeMissingStakingFarmFields(
                    stakingFarm,
                );

            this.stateStore.setStakingFarm(completeStakingFarm.address, {
                ...completeStakingFarm,
            });
        }
    }

    private initializeStakingProxies(
        stakingProxies: StakingProxyModel[],
    ): void {
        for (const stakingProxy of stakingProxies) {
            const completeStakingProxy =
                this.stakingComputeService.computeMissingStakingProxyFields(
                    stakingProxy,
                );

            const pair = this.stateStore.pairs.get(
                completeStakingProxy.pairAddress,
            );
            const stakingFarm = this.stateStore.stakingFarms.get(
                stakingProxy.stakingFarmAddress,
            );

            if (pair && stakingFarm) {
                const updatedPair = { ...pair };
                updatedPair.hasDualFarms = true;
                updatedPair.stakingProxyAddress = stakingProxy.address;
                updatedPair.dualFarmRewardTokenId = stakingProxy.stakingTokenId;
                updatedPair.stakingFarmAddress =
                    stakingProxy.stakingFarmAddress;
                updatedPair.compoundedAPR.dualFarmBaseAPR = stakingFarm.baseApr;
                updatedPair.compoundedAPR.dualFarmBoostedAPR =
                    stakingFarm.maxBoostedApr;

                this.stateStore.setPair(pair.address, updatedPair);

                this.stateStore.addStakingFarmPair(
                    stakingProxy.stakingFarmAddress,
                    pair.address,
                );
            }

            this.stateStore.setStakingProxy(completeStakingProxy.address, {
                ...completeStakingProxy,
            });
        }
    }

    private initializeFeesCollector(feesCollector: FeesCollectorModel): void {
        const completeFeesCollector =
            this.feesCollectorComputeService.computeMissingFeesCollectorFields(
                feesCollector,
            );

        this.stateStore.setFeesCollector({ ...completeFeesCollector });
    }
}
