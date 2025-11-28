import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
    BaseEsdtToken,
    EsdtToken,
    EsdtTokenType,
} from '../models/esdtToken.model';
import {
    TokenSortingArgs,
    TokensFilter,
    TokensFiltersArgs,
} from '../models/tokens.filter.args';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenRepositoryService } from './token.repository.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { NftCollection } from '../models/nftCollection.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CacheService } from 'src/services/caching/cache.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { PaginationArgs } from 'src/modules/dex.model';
import { getAllKeys } from 'src/utils/get.many.utils';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenPersistenceService } from 'src/modules/persistence/services/token.persistence.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenRepository: TokenRepositoryService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly routerAbi: RouterAbiService,
        private readonly apiService: MXApiService,
        protected readonly cachingService: CacheService,
        @Inject(forwardRef(() => TokenPersistenceService))
        private readonly tokenPersistence: TokenPersistenceService,
    ) {}

    // TODO : deprecate this
    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs(filters.enabledSwaps);
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter((tokenID) =>
                filters.identifiers.includes(tokenID),
            );
        }

        let tokens = await this.getAllTokensMetadata(tokenIDs);

        if (filters.type) {
            const tokenTypes = await this.getAllEsdtTokensType(tokenIDs);
            tokens.forEach((token, index) => {
                token.type = tokenTypes[index];
            });
            tokens = tokens.filter((token) => token.type === filters.type);
        }

        return tokens;
    }

    async getFilteredTokens(
        pagination: PaginationArgs,
        filters: TokensFilter,
        sorting: TokenSortingArgs,
    ): Promise<CollectionType<EsdtToken>> {
        const dbResult = await this.tokenPersistence.getFilteredTokens(
            pagination.offset,
            pagination.limit,
            filters,
            sorting,
        );

        const items = await this.getAllTokensMetadata(
            dbResult.tokens.map((token) => token.identifier),
        );

        return new CollectionType({
            count: dbResult.count,
            items: items,
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async getEsdtTokenType(tokenID: string): Promise<string> {
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            tokenID,
        );
        if (pairAddress) {
            return EsdtTokenType.FungibleLpToken;
        }

        return this.tokenRepository.getTokenType(tokenID);
    }

    async getAllEsdtTokensType(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            tokenIDs,
            'token.getEsdtTokenType',
            this.getEsdtTokenType.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async tokenMetadata(tokenID: string): Promise<EsdtToken> {
        const [token] = await this.getAllTokensMetadata([tokenID]);
        return token;
    }

    async tokenMetadataRaw(tokenID: string): Promise<EsdtToken> {
        return this.apiService.getToken(tokenID);
    }

    async getAllTokensMetadata(tokenIDs: string[]): Promise<EsdtToken[]> {
        return this.tokenPersistence.getTokensByIdentifier(tokenIDs);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.BaseToken.remoteTtl,
        localTtl: CacheTtlInfo.BaseToken.localTtl,
    })
    async baseTokenMetadata(tokenID: string): Promise<BaseEsdtToken> {
        return this.baseTokenMetadataRaw(tokenID);
    }

    async getAllBaseTokensMetadata(
        tokenIDs: string[],
    ): Promise<BaseEsdtToken[]> {
        return getAllKeys<BaseEsdtToken>(
            this.cachingService,
            tokenIDs,
            'token.baseTokenMetadata',
            this.baseTokenMetadata.bind(this),
            CacheTtlInfo.BaseToken,
        );
    }

    async baseTokenMetadataRaw(tokenID: string): Promise<BaseEsdtToken> {
        const token = await this.apiService.getToken(tokenID);

        return new BaseEsdtToken({
            identifier: tokenID,
            decimals: token.decimals,
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        return this.getNftCollectionMetadataRaw(collection);
    }

    async getAllNftsCollectionMetadata(
        collections: string[],
    ): Promise<NftCollection[]> {
        return getAllKeys<NftCollection>(
            this.cachingService,
            collections,
            'token.getNftCollectionMetadata',
            this.getNftCollectionMetadata.bind(this),
            CacheTtlInfo.Token,
        );
    }

    async getNftCollectionMetadataRaw(
        collection: string,
    ): Promise<NftCollection> {
        return this.apiService.getNftCollection(collection);
    }

    async getUniqueTokenIDs(activePool: boolean): Promise<string[]> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const tokenIDs: string[] = [];
        const pairStates = activePool
            ? await this.pairService.getAllStates(
                  pairsMetadata.map((pair) => pair.address),
              )
            : [];

        for (const [index, pair] of pairsMetadata.entries()) {
            if (activePool) {
                if (pairStates[index] !== 'Active') {
                    continue;
                }
            }
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        }

        return [...new Set(tokenIDs)];
    }
}
