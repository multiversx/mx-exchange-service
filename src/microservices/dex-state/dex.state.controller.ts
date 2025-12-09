import { Controller, ServiceUnavailableException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    DEX_STATE_SERVICE_NAME,
    GetAllTokensRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsAndTokensRequest,
    GetPairsRequest,
    GetTokensRequest,
    IDexStateService,
    InitStateRequest,
    InitStateResponse,
    PaginatedPairs,
    PaginatedTokens,
    Pairs,
    PairsAndTokensResponse,
    Tokens,
    UpdatePairsRequest,
    UpdatePairsResponse,
    UpdateTokensRequest,
    UpdateTokensResponse,
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

    private ensureReady() {
        if (!this.dexStateService.isReady()) {
            throw new ServiceUnavailableException(
                'DEX snapshot is initializing',
            );
        }
    }
}
