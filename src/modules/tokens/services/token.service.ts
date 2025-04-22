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
import { CacheService } from 'src/services/caching/cache.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { TokenComputeService } from './token.compute.service';
import BigNumber from 'bignumber.js';
import { SortingOrder } from 'src/modules/common/page.data';
import { TokenFilteringService } from './token.filtering.service';
import { PaginationArgs } from 'src/modules/dex.model';
import { getAllKeys } from 'src/utils/get.many.utils';
import { PairService } from 'src/modules/pair/services/pair.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenRepository: TokenRepositoryService,
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
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

        let tokens = await this.getAllTokensMetadata(tokenIDs);

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

    private async sortTokens(
        tokenIDs: string[],
        tokenSorting: TokenSortingArgs,
    ): Promise<string[]> {
        let sortFieldData = [];

        switch (tokenSorting.sortField) {
            case TokensSortableFields.PRICE:
                sortFieldData =
                    await this.tokenCompute.getAllTokensPriceDerivedUSD(
                        tokenIDs,
                    );
                break;
            case TokensSortableFields.PREVIOUS_24H_PRICE:
                sortFieldData =
                    await this.tokenCompute.getAllTokensPrevious24hPrice(
                        tokenIDs,
                    );
                break;
            case TokensSortableFields.PREVIOUS_7D_PRICE:
                sortFieldData =
                    await this.tokenCompute.getAllTokensPrevious7dPrice(
                        tokenIDs,
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
                sortFieldData = await this.tokenCompute.getAllTokensCreatedAt(
                    tokenIDs,
                );
                break;
            case TokensSortableFields.LIQUIDITY:
                sortFieldData =
                    await this.tokenCompute.getAllTokensLiquidityUSD(tokenIDs);
                break;
            case TokensSortableFields.VOLUME:
                sortFieldData =
                    await this.tokenCompute.getAllTokensVolumeUSD24h(tokenIDs);
                break;
            case TokensSortableFields.PREVIOUS_24H_VOLUME:
                sortFieldData =
                    await this.tokenCompute.getAllTokensPrevious24hVolumeUSD(
                        tokenIDs,
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
