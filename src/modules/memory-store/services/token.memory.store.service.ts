import { Injectable } from '@nestjs/common';
import { IMemoryStoreService } from './interfaces';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokensResponse } from 'src/modules/tokens/models/tokens.response';
import { GlobalState, GlobalStateInitStatus } from '../entities/global.state';
import { QueryField } from '../entities/query.field.type';
import { plainToInstance } from 'class-transformer';
import {
    TokensFilter,
    TokensFiltersArgs,
    TokenSortingArgs,
    TokensSortableFields,
} from 'src/modules/tokens/models/tokens.filter.args';
import { PaginationArgs } from 'src/modules/dex.model';
import ConnectionArgs, {
    getPagingParameters,
} from 'src/modules/common/filters/connection.args';
import { createModelFromFields } from '../utils/graphql.utils';
import PageResponse from 'src/modules/common/page.response';
import { SortingOrder } from 'src/modules/common/page.data';
import { Connection } from 'graphql-relay';
import BigNumber from 'bignumber.js';
import {
    calculateTokenPriceChange24h,
    calculateTokenPriceChange7d,
    calculateTokenTradeChange24h,
    calculateTokenVolumeUSDChange24h,
} from 'src/utils/token.utils';

@Injectable()
export class TokenMemoryStoreService extends IMemoryStoreService<
    EsdtToken,
    TokensResponse
> {
    static typenameMappings: Record<string, Record<string, string>> = {
        EsdtToken: {
            assets: 'AssetsModel',
            roles: 'RolesModel',
        },
        AssetsModel: {
            social: 'SocialModel',
        },
    };

    static targetedQueries: Record<
        string,
        {
            isFiltered: boolean;
            missingFields: QueryField[];
            identifierField: string;
        }
    > = {
        tokens: {
            isFiltered: false,
            identifierField: 'identifier',
            missingFields: [],
        },
        filteredTokens: {
            isFiltered: true,
            identifierField: 'identifier',
            missingFields: [],
        },
    };

    isReady(): boolean {
        // TODO: implement separate readiness status per store
        return GlobalState.initStatus === GlobalStateInitStatus.DONE;
    }

    getAllData(): EsdtToken[] {
        return GlobalState.getTokensArray();
    }

    getQueryResponse(
        queryName: string,
        queryArguments: Record<string, any>,
        requestedFields: QueryField[],
    ): TokensResponse | EsdtToken[] {
        if (!TokenMemoryStoreService.targetedQueries[queryName]) {
            throw new Error(
                `Data for query '${queryName}' is not solvable from the memory store.`,
            );
        }

        const isFilteredQuery =
            TokenMemoryStoreService.targetedQueries[queryName].isFiltered;

        const pagination = this.getPaginationFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const filters = this.getFiltersFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const sorting = this.getSortingFromArgs(queryArguments);

        console.log({ filters });
        let tokens = GlobalState.getPairsTokens(filters.enabledSwaps);
        tokens = this.filterTokens(tokens, filters, isFilteredQuery);

        if (!isFilteredQuery) {
            return tokens.map((token) =>
                createModelFromFields(
                    token,
                    requestedFields,
                    'EsdtToken',
                    this.getTypenameMapping(),
                ),
            );
        }

        if (sorting && sorting.sortField) {
            tokens = this.sortTokens(
                tokens,
                sorting.sortField,
                sorting.sortOrder,
            );
        }

        const totalCount = tokens.length;

        return PageResponse.mapResponse<EsdtToken>(
            tokens
                .map((token) =>
                    createModelFromFields(
                        token,
                        requestedFields,
                        'EsdtToken',
                        this.getTypenameMapping(),
                    ),
                )
                .slice(pagination.offset, pagination.offset + pagination.limit),
            this.getConnectionFromArgs(queryArguments) ?? new ConnectionArgs(),
            totalCount,
            pagination.offset,
            pagination.limit,
        );
    }

    appendFieldsToQueryResponse(
        queryName: string,
        response: TokensResponse | EsdtToken[],
        requestedFields: QueryField[],
    ): TokensResponse | EsdtToken[] {
        if (!TokenMemoryStoreService.targetedQueries[queryName]) {
            throw new Error(
                `Data for query '${queryName}' is not solvable from the memory store.`,
            );
        }
        const currentQuery = TokenMemoryStoreService.targetedQueries[queryName];

        if (currentQuery.isFiltered) {
            return this.appendFieldsToFilteredQueryResponse(
                response,
                queryName,
                requestedFields,
            );
        }

        const responseArray = response as EsdtToken[];

        const identifierField = currentQuery.identifierField;

        const originalIdentifiers = responseArray.map(
            (token) => token[identifierField],
        );

        const tokensFromStore = this.getTokensByIDs(
            queryName,
            requestedFields,
            originalIdentifiers,
        );

        return responseArray.map((token, index) => {
            return {
                ...token,
                ...tokensFromStore[index],
            };
        });
    }

    getTypenameMapping(): Record<string, Record<string, string>> {
        return TokenMemoryStoreService.typenameMappings;
    }

    getTargetedQueries(): Record<
        string,
        {
            isFiltered: boolean;
            missingFields: QueryField[];
            identifierField: string;
        }
    > {
        return TokenMemoryStoreService.targetedQueries;
    }

    private appendFieldsToFilteredQueryResponse(
        response: Record<string, any>,
        queryName: string,
        requestedFields: QueryField[],
    ): TokensResponse {
        const identifierField =
            TokenMemoryStoreService.targetedQueries[queryName].identifierField;

        const connectionResponse = response as Connection<EsdtToken>;

        const originalIdentifiers = connectionResponse.edges.map((edge) => {
            return edge.node[identifierField];
        });

        const tokensFromStore = this.getTokensByIDs(
            queryName,
            requestedFields,
            originalIdentifiers,
        );

        connectionResponse.edges = connectionResponse.edges.map(
            (edge, index) => {
                edge.node = {
                    ...edge.node,
                    ...tokensFromStore[index],
                };
                return edge;
            },
        );

        return connectionResponse as TokensResponse;
    }

    private getTokensByIDs(
        queryName: string,
        requestedFields: QueryField[],
        identifiers?: string[],
    ): EsdtToken[] {
        const identifierField =
            TokenMemoryStoreService.targetedQueries[queryName].identifierField;

        let tokens = GlobalState.getTokensArray();

        if (identifiers && identifiers.length > 0) {
            tokens = tokens.filter((token) =>
                identifiers.includes(token[identifierField]),
            );
        }

        return tokens.map((token) =>
            createModelFromFields(
                token,
                requestedFields,
                'EsdtToken',
                this.getTypenameMapping(),
            ),
        );
    }

    private getFiltersFromArgs(
        queryArguments: Record<string, any>,
        isFilteredQuery: boolean,
    ): TokensFiltersArgs | TokensFilter {
        const filters = isFilteredQuery
            ? plainToInstance(TokensFilter, queryArguments.filters, {
                  excludeExtraneousValues: true,
                  enableImplicitConversion: true,
                  exposeUnsetFields: false,
              })
            : plainToInstance(TokensFiltersArgs, queryArguments, {
                  excludeExtraneousValues: true,
                  enableImplicitConversion: true,
                  exposeUnsetFields: false,
              });

        return filters;
    }

    private getPaginationFromArgs(
        queryArguments: Record<string, any>,
        isFilteredQuery: boolean,
    ): PaginationArgs {
        if (!isFilteredQuery) {
            return plainToInstance(PaginationArgs, queryArguments, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true,
                exposeUnsetFields: false,
            });
        }

        const connectionArgs = this.getConnectionFromArgs(queryArguments);

        return getPagingParameters(connectionArgs);
    }

    private getConnectionFromArgs(
        queryArguments: Record<string, any>,
    ): ConnectionArgs {
        return plainToInstance(ConnectionArgs, queryArguments.pagination, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            exposeUnsetFields: false,
        });
    }

    private getSortingFromArgs(
        queryArguments: Record<string, any>,
    ): TokenSortingArgs {
        return plainToInstance(TokenSortingArgs, queryArguments.sorting, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            exposeUnsetFields: false,
        });
    }

    private filterTokens(
        tokens: EsdtToken[],
        filters: TokensFiltersArgs | TokensFilter,
        isFilteredQuery: boolean,
    ): EsdtToken[] {
        tokens = this.filterByIdentifiers(tokens, filters);
        tokens = this.filterByType(tokens, filters);

        if (!isFilteredQuery) {
            return tokens;
        }

        tokens = this.filterBySearchTerm(tokens, filters as TokensFilter);
        tokens = this.filterByLiquidityUSD(tokens, filters as TokensFilter);

        return tokens;
    }

    private filterByIdentifiers(
        tokens: EsdtToken[],
        filters: TokensFiltersArgs | TokensFilter,
    ): EsdtToken[] {
        if (!filters.identifiers || filters.identifiers.length === 0) {
            return tokens;
        }

        return tokens.filter((token) =>
            filters.identifiers.includes(token.identifier),
        );
    }

    private filterByType(
        tokens: EsdtToken[],
        filters: TokensFiltersArgs | TokensFilter,
    ): EsdtToken[] {
        if (!filters.type) {
            return tokens;
        }

        return tokens.filter((token) => token.type === filters.type);
    }

    private filterBySearchTerm(
        tokens: EsdtToken[],
        filters: TokensFilter,
    ): EsdtToken[] {
        if (!filters.searchToken || filters.searchToken.trim().length < 3) {
            return tokens;
        }

        const searchTerm = filters.searchToken.toUpperCase().trim();

        return tokens.filter(
            (token) =>
                token.name.toUpperCase().includes(searchTerm) ||
                token.identifier.toUpperCase().includes(searchTerm) ||
                token.ticker.toUpperCase().includes(searchTerm),
        );
    }

    private filterByLiquidityUSD(
        tokens: EsdtToken[],
        filters: TokensFilter,
    ): EsdtToken[] {
        if (!filters.minLiquidity) {
            return tokens;
        }

        return tokens.filter((token) => {
            const liquidity = new BigNumber(token.liquidityUSD);
            return liquidity.gte(filters.minLiquidity);
        });
    }

    private sortTokens(
        tokens: EsdtToken[],
        sortField: string,
        sortOrder: SortingOrder,
    ): EsdtToken[] {
        switch (sortField) {
            case TokensSortableFields.PRICE:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.price).comparedTo(b.price);
                    }
                    return new BigNumber(b.price).comparedTo(a.price);
                });
            case TokensSortableFields.PREVIOUS_24H_PRICE:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.previous24hPrice).comparedTo(
                            b.previous24hPrice,
                        );
                    }
                    return new BigNumber(b.previous24hPrice).comparedTo(
                        a.previous24hPrice,
                    );
                });
            case TokensSortableFields.PREVIOUS_7D_PRICE:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.previous7dPrice).comparedTo(
                            b.previous7dPrice,
                        );
                    }
                    return new BigNumber(b.previous7dPrice).comparedTo(
                        a.previous7dPrice,
                    );
                });
            case TokensSortableFields.PRICE_CHANGE_7D:
                return tokens.sort((a, b) => {
                    const priceChangeA = calculateTokenPriceChange7d(
                        a.price,
                        a.previous7dPrice,
                    );
                    const priceChangeB = calculateTokenPriceChange7d(
                        b.price,
                        b.previous7dPrice,
                    );

                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(priceChangeA).comparedTo(
                            priceChangeB,
                        );
                    }
                    return new BigNumber(priceChangeB).comparedTo(priceChangeA);
                });
            case TokensSortableFields.PRICE_CHANGE_24H:
                return tokens.sort((a, b) => {
                    const priceChangeA = calculateTokenPriceChange24h(
                        a.price,
                        a.previous24hPrice,
                    );
                    const priceChangeB = calculateTokenPriceChange24h(
                        b.price,
                        b.previous24hPrice,
                    );

                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(priceChangeA).comparedTo(
                            priceChangeB,
                        );
                    }
                    return new BigNumber(priceChangeB).comparedTo(priceChangeA);
                });
            case TokensSortableFields.VOLUME_CHANGE_24H:
                return tokens.sort((a, b) => {
                    const volumeChangeA = calculateTokenVolumeUSDChange24h(
                        a.volumeUSD24h,
                        a.previous24hVolume,
                    );
                    const volumeChangeB = calculateTokenVolumeUSDChange24h(
                        b.volumeUSD24h,
                        b.previous24hVolume,
                    );

                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(volumeChangeA).comparedTo(
                            volumeChangeB,
                        );
                    }
                    return new BigNumber(volumeChangeB).comparedTo(
                        volumeChangeA,
                    );
                });
            case TokensSortableFields.TRADES_COUNT_CHANGE_24H:
                return tokens.sort((a, b) => {
                    const tradeCountChangeA = calculateTokenTradeChange24h(
                        a.swapCount24h,
                        a.previous24hSwapCount,
                    );
                    const tradeCountChangeB = calculateTokenTradeChange24h(
                        b.swapCount24h,
                        b.previous24hSwapCount,
                    );

                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(tradeCountChangeA).comparedTo(
                            tradeCountChangeB,
                        );
                    }
                    return new BigNumber(tradeCountChangeB).comparedTo(
                        tradeCountChangeA,
                    );
                });
            case TokensSortableFields.CREATED_AT:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.createdAt).comparedTo(
                            b.createdAt,
                        );
                    }
                    return new BigNumber(b.createdAt).comparedTo(a.createdAt);
                });
            case TokensSortableFields.LIQUIDITY:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.liquidityUSD).comparedTo(
                            b.liquidityUSD,
                        );
                    }
                    return new BigNumber(b.liquidityUSD).comparedTo(
                        a.liquidityUSD,
                    );
                });
            case TokensSortableFields.VOLUME:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.volumeUSD24h).comparedTo(
                            b.volumeUSD24h,
                        );
                    }
                    return new BigNumber(b.volumeUSD24h).comparedTo(
                        a.volumeUSD24h,
                    );
                });
            case TokensSortableFields.PREVIOUS_24H_VOLUME:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.previous24hVolume).comparedTo(
                            b.previous24hVolume,
                        );
                    }
                    return new BigNumber(b.previous24hVolume).comparedTo(
                        a.previous24hVolume,
                    );
                });
            case TokensSortableFields.TRADES_COUNT:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.swapCount24h).comparedTo(
                            b.swapCount24h,
                        );
                    }
                    return new BigNumber(b.swapCount24h).comparedTo(
                        a.swapCount24h,
                    );
                });
            case TokensSortableFields.TRENDING_SCORE:
                return tokens.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.trendingScore).comparedTo(
                            b.trendingScore,
                        );
                    }
                    return new BigNumber(b.trendingScore).comparedTo(
                        a.trendingScore,
                    );
                });
            default:
                return tokens;
        }
    }
}
