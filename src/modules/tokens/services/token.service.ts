import { Injectable } from '@nestjs/common';
import { BaseEsdtToken, EsdtToken } from '../models/esdtToken.model';
import {
    TokenSortingArgs,
    TokensFilter,
    TokensFiltersArgs,
} from '../models/tokens.filter.args';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { NftCollection } from '../models/nftCollection.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CacheService } from 'src/services/caching/cache.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { PaginationArgs } from 'src/modules/dex.model';
import { getAllKeys } from 'src/utils/get.many.utils';
import { TokensStateService } from 'src/modules/state/services/tokens.state.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly apiService: MXApiService,
        protected readonly cachingService: CacheService,
        private readonly tokensState: TokensStateService,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        const tokensFilter = new TokensFilter();
        tokensFilter.enabledSwaps = filters.enabledSwaps;
        tokensFilter.identifiers = filters.identifiers
            ? filters.identifiers
            : undefined;

        const result = await this.tokensState.getFilteredTokens(
            0,
            10000,
            tokensFilter,
        );

        return result.tokens;
    }

    async getFilteredTokens(
        pagination: PaginationArgs,
        filters: TokensFilter,
        sorting: TokenSortingArgs,
    ): Promise<CollectionType<EsdtToken>> {
        const result = await this.tokensState.getFilteredTokens(
            pagination.offset,
            pagination.limit,
            filters,
            sorting,
        );

        return new CollectionType({
            count: result.count,
            items: result.tokens,
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
    async tokenMetadata(tokenID: string): Promise<EsdtToken> {
        return this.tokenMetadataRaw(tokenID);
    }

    async getAllTokensMetadata(tokenIDs: string[]): Promise<EsdtToken[]> {
        return getAllKeys<EsdtToken>(
            this.cachingService,
            tokenIDs,
            'token.tokenMetadata',
            this.tokenMetadata.bind(this),
            CacheTtlInfo.Token,
        );
    }

    async tokenMetadataRaw(tokenID: string): Promise<EsdtToken> {
        return this.apiService.getToken(tokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async tokenMetadataFromState(
        tokenID: string,
        fields: (keyof EsdtToken)[] = [],
    ): Promise<EsdtToken> {
        const [token] = await this.tokensState.getTokens([tokenID], fields);
        return token;
    }

    async getAllTokensMetadataFromState(
        tokenIDs: string[],
        fields: (keyof EsdtToken)[] = [],
    ): Promise<EsdtToken[]> {
        return this.tokensState.getTokens(tokenIDs, fields);
    }

    async getAllTokens(fields: (keyof EsdtToken)[] = []): Promise<EsdtToken[]> {
        return this.tokensState.getAllTokens(fields);
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
        const filters = new TokensFilter();

        if (activePool) {
            filters.enabledSwaps = true;
        }

        const result = await this.tokensState.getFilteredTokens(
            0,
            10000,
            filters,
            undefined,
            ['identifier'],
        );

        return result.tokens.map((token) => token.identifier);
    }
}
