import { Injectable } from '@nestjs/common';
import { EsdtToken } from '../models/esdtToken.model';
import { TokensFiltersArgs } from '../models/tokens.filter.args';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenRepositoryService } from './token.repository.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { NftCollection } from '../models/nftCollection.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CachingService } from 'src/services/caching/cache.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenRepository: TokenRepositoryService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly apiService: MXApiService,
        protected readonly cachingService: CachingService,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs(filters.enabledSwaps);
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter((tokenID) =>
                filters.identifiers.includes(tokenID),
            );
        }

        const promises = tokenIDs.map((tokenID) =>
            this.getTokenMetadata(tokenID),
        );
        let tokens = await Promise.all(promises);

        if (filters.type) {
            for (const token of tokens) {
                token.type = await this.esdtTokenType(token.identifier);
            }
            tokens = tokens.filter((token) => token.type === filters.type);
        }

        return tokens;
    }

    @ErrorLoggerAsync({
        className: 'TokenService',
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async esdtTokenType(tokenID: string): Promise<string> {
        return await this.tokenRepository.getTokenType(tokenID);
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }
        const cacheKey = `token.${tokenID}`;
        const cachedToken = await this.cachingService.getCache<EsdtToken>(
            cacheKey,
        );
        if (cachedToken && cachedToken !== undefined) {
            await this.cachingService.setCache<EsdtToken>(
                cacheKey,
                cachedToken,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );
            return cachedToken;
        }

        const token = await this.apiService.getToken(tokenID);

        if (token !== undefined) {
            await this.cachingService.setCache<EsdtToken>(
                cacheKey,
                token,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );

            return token;
        }

        return undefined;
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        if (collection === undefined) {
            return undefined;
        }
        const cacheKey = `token.${collection}`;
        const cachedToken = await this.cachingService.getCache<NftCollection>(
            cacheKey,
        );
        if (cachedToken && cachedToken !== undefined) {
            await this.cachingService.setCache<NftCollection>(
                cacheKey,
                cachedToken,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );
            return cachedToken;
        }

        const token = await this.apiService.getNftCollection(collection);

        if (token !== undefined) {
            await this.cachingService.setCache<NftCollection>(
                cacheKey,
                token,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );

            return token;
        }

        return undefined;
    }

    async getUniqueTokenIDs(activePool: boolean): Promise<string[]> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const tokenIDs: string[] = [];
        await Promise.all(
            pairsMetadata.map(async (iterator) => {
                if (activePool) {
                    const state = await this.pairAbi.state(iterator.address);
                    if (state !== 'Active') {
                        return;
                    }
                }
                tokenIDs.push(
                    ...[iterator.firstTokenID, iterator.secondTokenID],
                );
            }),
        );
        return [...new Set(tokenIDs)];
    }
}
