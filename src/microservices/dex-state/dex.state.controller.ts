import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
    DEX_STATE_SERVICE_NAME,
    GetAllTokensRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsRequest,
    GetTokensRequest,
    IDexStateService,
    PaginatedPairs,
    PaginatedTokens,
    Pairs,
    Tokens,
} from './interfaces/dex_state.interfaces';
import { DexStateService } from './services/dex.state.service';

@Controller()
export class DexStateController implements IDexStateService {
    constructor(private readonly dexStateService: DexStateService) {}

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetPairs')
    getPairs(request: GetPairsRequest): Pairs {
        return this.dexStateService.getPairs(
            request.addresses,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllPairs')
    getAllPairs(request: GetPairsRequest): Pairs {
        return this.dexStateService.getAllPairs(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFilteredPairs')
    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        return this.dexStateService.getFilteredPairs(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetTokens')
    getTokens(request: GetTokensRequest): Tokens {
        return this.dexStateService.getTokens(
            request.identifiers,
            request.fields?.paths ?? [],
        );
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetAllTokens')
    getAllTokens(request: GetAllTokensRequest): Tokens {
        return this.dexStateService.getAllTokens(request);
    }

    @GrpcMethod(DEX_STATE_SERVICE_NAME, 'GetFilteredTokens')
    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        return this.dexStateService.getFilteredTokens(request);
    }
}
