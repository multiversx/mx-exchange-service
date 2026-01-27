import { Controller, ServiceUnavailableException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    DEX_STATE_SERVICE_NAME,
    Farms,
    GetAllFarmsRequest,
    GetAllStakingFarmsRequest,
    GetAllStakingProxiesRequest,
    GetAllTokensRequest,
    GetFarmsRequest,
    GetFeesCollectorRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsAndTokensRequest,
    GetPairsRequest,
    GetStakingFarmsRequest,
    GetStakingProxiesRequest,
    GetTokensRequest,
    GetWeeklyTimekeepingRequest,
    IDexStateService,
    InitStateRequest,
    InitStateResponse,
    PaginatedPairs,
    PaginatedTokens,
    Pairs,
    PairsAndTokensResponse,
    PairsCountResponse,
    StakingFarms,
    StakingProxies,
    Tokens,
    UpdateFarmsRequest,
    UpdateFarmsResponse,
    UpdateFeesCollectorRequest,
    UpdatePairsRequest,
    UpdatePairsResponse,
    UpdateStakingFarmsRequest,
    UpdateStakingFarmsResponse,
    UpdateTokensRequest,
    UpdateTokensResponse,
    UpdateUsdcPriceRequest,
    UpdateUsdcPriceResponse,
} from './interfaces/dex_state.interfaces';
import { DexStateService } from './services/dex.state.service';

@Controller()
export class DexStateController implements IDexStateService {
    constructor(private readonly dexStateService: DexStateService) {}

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'InitState')
    initState(request: InitStateRequest): InitStateResponse {
        return this.dexStateService.initState(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetPairs')
    getPairs(request: GetPairsRequest): Pairs {
        this.ensureReady();
        return this.dexStateService.getPairs(
            request.addresses,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllPairs')
    getAllPairs(request: GetPairsRequest): Pairs {
        this.ensureReady();
        return this.dexStateService.getAllPairs(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFilteredPairs')
    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        this.ensureReady();
        return this.dexStateService.getFilteredPairs(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetPairsCount')
    getPairsCount(): PairsCountResponse {
        this.ensureReady();
        return this.dexStateService.getPairsCount();
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetPairsTokens')
    getPairsTokens(request: GetPairsAndTokensRequest): PairsAndTokensResponse {
        this.ensureReady();
        return this.dexStateService.getPairsTokens(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdatePairs')
    updatePairs(request: UpdatePairsRequest): UpdatePairsResponse {
        this.ensureReady();
        return this.dexStateService.updatePairs(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'AddPair')
    addPair(request: AddPairRequest): void {
        this.ensureReady();
        this.dexStateService.addPair(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'AddPairLpToken')
    addPairLpToken(request: AddPairLpTokenRequest): void {
        this.ensureReady();
        this.dexStateService.addPairLpToken(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetTokens')
    getTokens(request: GetTokensRequest): Tokens {
        this.ensureReady();
        return this.dexStateService.getTokens(
            request.identifiers,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllTokens')
    getAllTokens(request: GetAllTokensRequest): Tokens {
        this.ensureReady();
        return this.dexStateService.getAllTokens(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFilteredTokens')
    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        this.ensureReady();
        return this.dexStateService.getFilteredTokens(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdateTokens')
    updateTokens(request: UpdateTokensRequest): UpdateTokensResponse {
        this.ensureReady();
        return this.dexStateService.updateTokens(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdateUsdcPrice')
    updateUsdcPrice(request: UpdateUsdcPriceRequest): UpdateUsdcPriceResponse {
        this.ensureReady();
        return this.dexStateService.updateUsdcPrice(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFarms')
    getFarms(request: GetFarmsRequest): Farms {
        this.ensureReady();
        return this.dexStateService.getFarms(
            request.addresses,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllFarms')
    getAllFarms(request: GetAllFarmsRequest): Farms {
        this.ensureReady();
        return this.dexStateService.getAllFarms(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdateFarms')
    updateFarms(request: UpdateFarmsRequest): UpdateFarmsResponse {
        this.ensureReady();
        return this.dexStateService.updateFarms(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetStakingFarms')
    getStakingFarms(request: GetStakingFarmsRequest): StakingFarms {
        this.ensureReady();
        return this.dexStateService.getStakingFarms(
            request.addresses,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllStakingFarms')
    getAllStakingFarms(request: GetAllStakingFarmsRequest): StakingFarms {
        this.ensureReady();
        return this.dexStateService.getAllStakingFarms(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdateStakingFarms')
    updateStakingFarms(
        request: UpdateStakingFarmsRequest,
    ): UpdateStakingFarmsResponse {
        this.ensureReady();
        return this.dexStateService.updateStakingFarms(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetStakingProxies')
    getStakingProxies(request: GetStakingProxiesRequest): StakingProxies {
        this.ensureReady();
        return this.dexStateService.getStakingProxies(
            request.addresses,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllStakingProxies')
    getAllStakingProxies(request: GetAllStakingProxiesRequest): StakingProxies {
        this.ensureReady();
        return this.dexStateService.getAllStakingProxies(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFeesCollector')
    getFeesCollector(request: GetFeesCollectorRequest): FeesCollectorModel {
        this.ensureReady();
        return this.dexStateService.getFeesCollector(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'UpdateFeesCollector')
    updateFeesCollector(request: UpdateFeesCollectorRequest): void {
        this.ensureReady();
        this.dexStateService.updateFeesCollector(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetWeeklyTimekeeping')
    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ): WeekTimekeepingModel {
        this.ensureReady();
        return this.dexStateService.getWeeklyTimekeeping(request);
    }

    private ensureReady() {
        if (!this.dexStateService.isReady()) {
            throw new ServiceUnavailableException(
                'DEX snapshot is initializing',
            );
        }
    }
}
