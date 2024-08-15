import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { EsdtToken } from '../models/esdtToken.model';
import {
    TokenSortingArgs,
    TokensFilter,
    TokensFiltersArgs,
    TokensSortableFields,
} from '../models/tokens.filter.args';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenRepositoryService } from './token.repository.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { NftCollection } from '../models/nftCollection.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CollectionType } from 'src/modules/common/collection.type';
import { TokenComputeService } from './token.compute.service';
import BigNumber from 'bignumber.js';
import { SortingOrder } from 'src/modules/common/page.data';
import { TokenFilteringService } from './token.filtering.service';
import { PaginationArgs } from 'src/modules/dex.model';
import { getAllKeys } from 'src/utils/get.many.utils';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenRepository: TokenRepositoryService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly apiService: MXApiService,
        protected readonly cachingService: CacheService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        @Inject(forwardRef(() => TokenFilteringService))
        private readonly tokenFilteringService: TokenFilteringService,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs(filters.enabledSwaps);
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter((tokenID) =>
                filters.identifiers.includes(tokenID),
            );
        }

        const promises = tokenIDs.map((tokenID) => this.tokenMetadata(tokenID));
        let tokens = await Promise.all(promises);

        if (filters.type) {
            for (const token of tokens) {
                token.type = await this.getEsdtTokenType(token.identifier);
            }
            tokens = tokens.filter((token) => token.type === filters.type);
        }

        return tokens;
    }

    async getFilteredTokens(
        pagination: PaginationArgs,
        filters: TokensFilter,
        sorting: TokenSortingArgs,
    ): Promise<CollectionType<EsdtToken>> {
        let tokenIDs = await this.getUniqueTokenIDs(filters.enabledSwaps);

        tokenIDs = this.tokenFilteringService.tokensByIdentifier(
            filters,
            tokenIDs,
        );

        tokenIDs = await this.tokenFilteringService.tokensByType(
            filters,
            tokenIDs,
        );

        tokenIDs = await this.tokenFilteringService.tokensByLiquidityUSD(
            filters,
            tokenIDs,
        );

        if (sorting) {
            tokenIDs = await this.sortTokens(tokenIDs, sorting);
        }

        let tokens = await Promise.all(
            tokenIDs.map((tokenID) => this.tokenMetadata(tokenID)),
        );

        tokens = await this.tokenFilteringService.tokensBySearchTerm(
            filters,
            tokens,
        );

        return new CollectionType({
            count: tokens.length,
            items: tokens.slice(
                pagination.offset,
                pagination.offset + pagination.limit,
            ),
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getEsdtTokenType(tokenID: string): Promise<string> {
        return await this.tokenRepository.getTokenType(tokenID);
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
        console.log('tokenMetadata', tokenID);
        return this.tokenMetadataRaw(tokenID);
    }

    async getAllTokensMetadata(tokenIDs: string[]): Promise<EsdtToken[]> {
        return getAllKeys<EsdtToken>(
            this.cachingService,
            tokenIDs,
            'token.getTokensMetadata',
            this.tokenMetadata.bind(this),
        );
    }

    async tokenMetadataRaw(tokenID: string): Promise<EsdtToken> {
        return this.apiService.getToken(tokenID);
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
            'token.getNftsCollectionMetadata',
            this.getNftCollectionMetadata.bind(this),
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

    private async sortTokens(
        tokenIDs: string[],
        tokenSorting: TokenSortingArgs,
    ): Promise<string[]> {
        let sortFieldData = [];

        switch (tokenSorting.sortField) {
            case TokensSortableFields.PRICE:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenPriceDerivedUSD(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.PREVIOUS_24H_PRICE:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenPrevious24hPrice(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.PREVIOUS_7D_PRICE:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenPrevious7dPrice(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.PRICE_CHANGE_7D:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.computeTokenPriceChange7d(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.PRICE_CHANGE_24H:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenPriceChange24h(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.VOLUME_CHANGE_24H:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenVolumeUSDChange24h(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.TRADES_COUNT_CHANGE_24H:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenTradeChange24h(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.CREATED_AT:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenCreatedAt(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.LIQUIDITY:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenLiquidityUSD(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.VOLUME:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenVolumeUSD24h(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.PREVIOUS_24H_VOLUME:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenPrevious24hVolumeUSD(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.TRADES_COUNT:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenSwapCount(tokenID),
                    ),
                );
                break;
            case TokensSortableFields.TRENDING_SCORE:
                sortFieldData = await Promise.all(
                    tokenIDs.map((tokenID) =>
                        this.tokenCompute.tokenTrendingScore(tokenID),
                    ),
                );
                break;

            default:
                break;
        }

        const combined = tokenIDs.map((tokenID, index) => ({
            tokenID: tokenID,
            sortValue: new BigNumber(sortFieldData[index]),
        }));

        combined.sort((a, b) => {
            if (tokenSorting.sortOrder === SortingOrder.ASC) {
                return a.sortValue.comparedTo(b.sortValue);
            }

            return b.sortValue.comparedTo(a.sortValue);
        });

        return combined.map((item) => item.tokenID);
    }
}
