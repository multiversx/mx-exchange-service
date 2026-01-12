import { Injectable } from '@nestjs/common';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
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

@Injectable()
export class StateInitializationService {
    private readonly lockedTokenCollection = 'XMEX-82f2f4';

    constructor(
        private readonly stateStore: StateStore,
        private readonly farmComputeService: FarmComputeService,
        private readonly stakingComputeService: StakingComputeService,
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
        } = request;

        // Clear all existing state
        this.stateStore.clearAll();
        this.stateStore.setUsdcPrice(usdcPrice);
        this.stateStore.setCommonTokenIDs(commonTokenIDs);

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

    private initializeTokens(tokens: InitStateRequest['tokens']): void {
        for (const token of tokens) {
            this.stateStore.setToken(token.identifier, { ...token });
            this.stateStore.addTokenByType(
                token.type as EsdtTokenType,
                token.identifier,
            );
        }
    }

    private initializePairs(pairs: InitStateRequest['pairs']): void {
        for (const pair of pairs.values()) {
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

    private initializeFarms(farms: InitStateRequest['farms']): void {
        for (const farm of farms.values()) {
            const completeFarm =
                this.farmComputeService.computeMissingFarmFields(
                    farm,
                    this.stateStore.pairs,
                    this.stateStore.tokens,
                );

            const pair = this.stateStore.pairs.get(completeFarm.pairAddress);

            if (pair && completeFarm.rewardType !== FarmRewardType.DEPRECATED) {
                const updatedPair = { ...pair };
                updatedPair.hasFarms = true;
                updatedPair.farmAddress = completeFarm.address;
                updatedPair.farmRewardCollection = this.lockedTokenCollection;

                updatedPair.compoundedAPR.farmBaseAPR = completeFarm.baseApr;
                updatedPair.compoundedAPR.farmBoostedAPR =
                    completeFarm.boostedApr;

                this.stateStore.setPair(pair.address, updatedPair);
            }

            this.stateStore.setFarm(completeFarm.address, { ...completeFarm });
        }
    }

    private initializeStakingFarms(
        stakingFarms: InitStateRequest['stakingFarms'],
    ): void {
        for (const stakingFarm of stakingFarms.values()) {
            const completeStakingFarm =
                this.stakingComputeService.computeMissingStakingFarmFields(
                    stakingFarm,
                    this.stateStore.tokens,
                );

            this.stateStore.setStakingFarm(completeStakingFarm.address, {
                ...completeStakingFarm,
            });
        }
    }

    private initializeStakingProxies(
        stakingProxies: InitStateRequest['stakingProxies'],
    ): void {
        for (const stakingProxy of stakingProxies.values()) {
            const completeStakingProxy =
                this.stakingComputeService.computeMissingStakingProxyFields(
                    stakingProxy,
                    this.stateStore.stakingFarms,
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
            }

            this.stateStore.setStakingProxy(completeStakingProxy.address, {
                ...completeStakingProxy,
            });
        }
    }

    private initializeFeesCollector(
        feesCollector: InitStateRequest['feesCollector'],
    ): void {
        const completeFeesCollector =
            this.stakingComputeService.computeMissingFeesCollectorFields(
                feesCollector,
                this.stateStore.tokens,
            );

        this.stateStore.setFeesCollector({ ...completeFeesCollector });
    }
}
