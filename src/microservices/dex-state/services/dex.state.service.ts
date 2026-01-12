import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    Farms,
    GetAllFarmsRequest,
    GetAllPairsRequest,
    GetAllStakingFarmsRequest,
    GetAllStakingProxiesRequest,
    GetAllTokensRequest,
    GetFeesCollectorRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsAndTokensRequest,
    GetWeeklyTimekeepingRequest,
    InitStateRequest,
    InitStateResponse,
    PaginatedPairs,
    PaginatedTokens,
    Pairs,
    PairsAndTokensResponse,
    StakingFarms,
    StakingProxies,
    Tokens,
    UpdatePairsRequest,
    UpdatePairsResponse,
    UpdateTokensRequest,
    UpdateTokensResponse,
    UpdateUsdcPriceRequest,
    UpdateUsdcPriceResponse,
} from '../interfaces/dex_state.interfaces';
import { StateTasks, TaskDto } from 'src/modules/dex-state/entities';
import { queueStateTasks } from 'src/modules/dex-state/dex.state.utils';
import { CacheService } from 'src/services/caching/cache.service';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { StateStore } from './state.store';
import { StateInitializationService } from './state.initialization.service';
import { TokensStateHandler } from './handlers/tokens.state.handler';
import { PairsStateHandler } from './handlers/pairs.state.handler';
import { FarmsStateHandler } from './handlers/farms.state.handler';
import { StakingStateHandler } from './handlers/staking.state.handler';
import { FeesCollectorStateHandler } from './handlers/fees-collector.state.handler';
import { TimekeepingStateHandler } from './handlers/timekeeping.state.handler';
import { BulkUpdatesService } from './bulk.updates.service';

@Injectable()
export class DexStateService implements OnModuleInit {
    private bulkUpdatesService: BulkUpdatesService;

    constructor(
        private readonly cacheService: CacheService,
        private readonly stateStore: StateStore,
        private readonly initializationService: StateInitializationService,
        private readonly tokensHandler: TokensStateHandler,
        private readonly pairsHandler: PairsStateHandler,
        private readonly farmsHandler: FarmsStateHandler,
        private readonly stakingHandler: StakingStateHandler,
        private readonly feesCollectorHandler: FeesCollectorStateHandler,
        private readonly timekeepingHandler: TimekeepingStateHandler,
    ) {
        this.bulkUpdatesService = new BulkUpdatesService();
    }

    async onModuleInit() {
        await queueStateTasks(this.cacheService, [
            new TaskDto({
                name: StateTasks.INIT_STATE,
            }),
        ]);
    }

    isReady(): boolean {
        return this.stateStore.isInitialized();
    }

    initState(request: InitStateRequest): InitStateResponse {
        return this.initializationService.initState(request);
    }

    getPairs(addresses: string[], fields: string[] = []): Pairs {
        return this.pairsHandler.getPairs(addresses, fields);
    }

    getAllPairs(request: GetAllPairsRequest): Pairs {
        const fields = request.fields?.paths ?? [];
        return this.pairsHandler.getAllPairs(fields);
    }

    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        return this.pairsHandler.getFilteredPairs(request);
    }

    getPairsTokens(request: GetPairsAndTokensRequest): PairsAndTokensResponse {
        return this.pairsHandler.getPairsTokens(request);
    }

    addPair(request: AddPairRequest): void {
        this.pairsHandler.addPair(request);

        this.recomputeValues();
    }

    addPairLpToken(request: AddPairLpTokenRequest): void {
        this.pairsHandler.addPairLpToken(request);

        this.recomputeValues();
    }

    updatePairs(request: UpdatePairsRequest): UpdatePairsResponse {
        const result = this.pairsHandler.updatePairs(request);

        const tokensWithPriceUpdates = this.recomputeValues();
        result.tokensWithPriceUpdates = tokensWithPriceUpdates;

        return result;
    }

    getTokens(tokenIDs: string[], fields: string[] = []): Tokens {
        return this.tokensHandler.getTokens(tokenIDs, fields);
    }

    getAllTokens(request: GetAllTokensRequest): Tokens {
        const fields = request.fields?.paths ?? [];
        return this.tokensHandler.getAllTokens(fields);
    }

    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        return this.tokensHandler.getFilteredTokens(request);
    }

    updateTokens(request: UpdateTokensRequest): UpdateTokensResponse {
        const result = this.tokensHandler.updateTokens(request);
        this.recomputeValues();
        return result;
    }

    getFarms(addresses: string[], fields: string[] = []): Farms {
        return this.farmsHandler.getFarms(addresses, fields);
    }

    getAllFarms(request: GetAllFarmsRequest): Farms {
        const fields = request.fields?.paths ?? [];
        return this.farmsHandler.getAllFarms(fields);
    }

    getStakingFarms(addresses: string[], fields: string[] = []): StakingFarms {
        return this.stakingHandler.getStakingFarms(addresses, fields);
    }

    getAllStakingFarms(request: GetAllStakingFarmsRequest): StakingFarms {
        const fields = request.fields?.paths ?? [];
        return this.stakingHandler.getAllStakingFarms(fields);
    }

    getStakingProxies(
        addresses: string[],
        fields: string[] = [],
    ): StakingProxies {
        return this.stakingHandler.getStakingProxies(addresses, fields);
    }

    getAllStakingProxies(request: GetAllStakingProxiesRequest): StakingProxies {
        const fields = request.fields?.paths ?? [];
        return this.stakingHandler.getAllStakingProxies(fields);
    }

    getFeesCollector(request: GetFeesCollectorRequest): FeesCollectorModel {
        const fields = request.fields?.paths ?? [];
        return this.feesCollectorHandler.getFeesCollector(fields);
    }

    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ): WeekTimekeepingModel {
        return this.timekeepingHandler.getWeeklyTimekeeping(request);
    }

    updateUsdcPrice(request: UpdateUsdcPriceRequest): UpdateUsdcPriceResponse {
        if (!request.usdcPrice) {
            return { tokensWithPriceUpdates: [] };
        }

        this.stateStore.setUsdcPrice(request.usdcPrice);
        const tokensWithPriceUpdates = this.recomputeValues();

        return { tokensWithPriceUpdates };
    }

    private recomputeValues(): string[] {
        return this.bulkUpdatesService.recomputeAllValues(
            this.stateStore.pairs,
            this.stateStore.tokens,
            this.stateStore.usdcPrice,
            this.stateStore.commonTokenIDs,
        );
    }
}
