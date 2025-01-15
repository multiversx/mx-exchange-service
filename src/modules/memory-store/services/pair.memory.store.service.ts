import { Injectable } from '@nestjs/common';
import { PairModel } from '../../pair/models/pair.model';
import {
    GlobalState,
    GlobalStateInitStatus,
} from 'src/modules/memory-store/entities/global.state';
import {
    PairFilterArgs,
    PairsFilter,
    PairSortableFields,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { PaginationArgs } from 'src/modules/dex.model';
import { QueryField } from 'src/modules/memory-store/entities/query.field.type';
import { createModelFromFields } from 'src/modules/memory-store/utils/graphql.utils';
import { plainToInstance } from 'class-transformer';
import ConnectionArgs, {
    getPagingParameters,
} from 'src/modules/common/filters/connection.args';
import PageResponse from 'src/modules/common/page.response';
import BigNumber from 'bignumber.js';
import { SortingOrder } from 'src/modules/common/page.data';
import { IMemoryStoreService } from 'src/modules/memory-store/services/interfaces';
import { PairsResponse } from '../../pair/models/pairs.response';
import { Connection } from 'graphql-relay';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';

@Injectable()
export class PairMemoryStoreService extends IMemoryStoreService<
    PairModel,
    PairsResponse
> {
    static typenameMappings: Record<string, Record<string, string>> = {
        PairsResponse: {
            edges: 'PairModelEdge',
            pageInfo: 'PairModelPageInfo',
            pageData: 'PageData',
        },
        PairModelEdge: {
            node: 'PairModel',
        },
        PairModel: {
            firstToken: 'EsdtToken',
            secondToken: 'EsdtToken',
            liquidityPoolToken: 'EsdtToken',
            info: 'PairInfoModel',
            compoundedAPR: 'PairCompoundedAPRModel',
            rewardTokens: 'PairRewardTokensModel',
        },
        PairRewardTokensModel: {
            poolRewards: 'EsdtToken',
            farmReward: 'NftCollection',
            dualFarmReward: 'EsdtToken',
        },
        EsdtToken: {
            assets: 'AssetsModel',
            roles: 'RolesModel',
        },
        NftCollection: {
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
        pairs: {
            isFiltered: false,
            identifierField: 'address',
            missingFields: [
                { name: 'firstTokenVolume24h' },
                { name: 'secondTokenVolume24h' },
                { name: 'previous24hVolumeUSD' },
                { name: 'previous24hFeesUSD' },
                { name: 'lockedTokensInfo' },
                { name: 'whitelistedManagedAddresses' },
                { name: 'initialLiquidityAdder' },
                { name: 'feeDestinations' },
                { name: 'feesCollector' },
                { name: 'feesCollectorCutPercentage' },
                { name: 'trustedSwapPairs' },
            ],
        },
        filteredPairs: {
            isFiltered: true,
            identifierField: 'address',
            missingFields: [
                { name: 'firstTokenVolume24h' },
                { name: 'secondTokenVolume24h' },
                { name: 'previous24hVolumeUSD' },
                { name: 'previous24hFeesUSD' },
                { name: 'lockedTokensInfo' },
                { name: 'whitelistedManagedAddresses' },
                { name: 'initialLiquidityAdder' },
                { name: 'feeDestinations' },
                { name: 'feesCollector' },
                { name: 'feesCollectorCutPercentage' },
                { name: 'trustedSwapPairs' },
            ],
        },
    };

    isReady(): boolean {
        return GlobalState.initStatus === GlobalStateInitStatus.DONE;
    }

    getAllData(): PairModel[] {
        return GlobalState.getPairsArray();
    }

    getQueryResponse(
        queryName: string,
        queryArguments: Record<string, any>,
        requestedFields: QueryField[],
    ): PairModel[] | PairsResponse {
        if (PairMemoryStoreService.targetedQueries[queryName] === undefined) {
            throw new Error(
                `Data for query '${queryName}' is not solvable from the memory store.`,
            );
        }

        const isFilteredQuery =
            PairMemoryStoreService.targetedQueries[queryName].isFiltered;
        let pairs = GlobalState.getPairsArray();

        const pagination = this.getPaginationFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const filters = this.getFiltersFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const sorting = this.getSortingFromArgs(queryArguments);

        pairs = this.filterPairs(pairs, filters);

        if (!isFilteredQuery) {
            return pairs
                .map((pair) =>
                    createModelFromFields(
                        pair,
                        requestedFields,
                        'PairModel',
                        this.getTypenameMapping(),
                    ),
                )
                .slice(pagination.offset, pagination.offset + pagination.limit);
        }

        if (sorting && sorting.sortField) {
            pairs = this.sortPairs(pairs, sorting.sortField, sorting.sortOrder);
        }

        const totalCount = pairs.length;

        const response = PageResponse.mapResponse<PairModel>(
            pairs.slice(
                pagination.offset,
                pagination.offset + pagination.limit,
            ),
            this.getConnectionFromArgs(queryArguments) ?? new ConnectionArgs(),
            totalCount,
            pagination.offset,
            pagination.limit,
        );

        return createModelFromFields(
            response,
            requestedFields,
            'PairsResponse',
            this.getTypenameMapping(),
        );
    }

    appendFieldsToQueryResponse(
        queryName: string,
        response: PairModel[] | PairsResponse,
        requestedFields: QueryField[],
    ): PairModel[] | PairsResponse {
        if (PairMemoryStoreService.targetedQueries[queryName] === undefined) {
            throw new Error(
                `Data for query '${queryName}' is not solvable from the memory store.`,
            );
        }

        if (PairMemoryStoreService.targetedQueries[queryName].isFiltered) {
            return this.appendFieldsToFilteredQueryResponse(
                response,
                queryName,
                requestedFields,
            );
        }

        const responseArray = response as PairModel[];

        const identifierField =
            PairMemoryStoreService.targetedQueries[queryName].identifierField;

        const originalIdentifiers = responseArray.map(
            (pair) => pair[identifierField],
        );

        const pairsFromStore = this.getPairsByIDs(
            queryName,
            requestedFields,
            originalIdentifiers,
        );

        return responseArray.map((pair, index) => {
            return {
                ...pair,
                ...pairsFromStore[index],
            };
        });
    }

    getTypenameMapping(): Record<string, Record<string, string>> {
        return PairMemoryStoreService.typenameMappings;
    }

    getTargetedQueries(): Record<
        string,
        {
            isFiltered: boolean;
            missingFields: QueryField[];
            identifierField: string;
        }
    > {
        return PairMemoryStoreService.targetedQueries;
    }

    private appendFieldsToFilteredQueryResponse(
        response: Record<string, any>,
        queryName: string,
        requestedFields: QueryField[],
    ): PairsResponse {
        const identifierField =
            PairMemoryStoreService.targetedQueries[queryName].identifierField;

        const connectionResponse = response as Connection<PairModel>;

        const originalIdentifiers = connectionResponse.edges.map((edge) => {
            return edge.node[identifierField];
        });

        const pairsFromStore = this.getPairsByIDs(
            queryName,
            requestedFields,
            originalIdentifiers,
        );

        connectionResponse.edges = connectionResponse.edges.map(
            (edge, index) => {
                edge.node = {
                    ...edge.node,
                    ...pairsFromStore[index],
                };
                return edge;
            },
        );

        return connectionResponse as PairsResponse;
    }

    private getPairsByIDs(
        queryName: string,
        requestedFields: QueryField[],
        identifiers?: string[],
    ): PairModel[] {
        const identifierField =
            PairMemoryStoreService.targetedQueries[queryName].identifierField;

        let pairs = GlobalState.getPairsArray();

        if (identifiers && identifiers.length > 0) {
            pairs = pairs.filter((pair) =>
                identifiers.includes(pair[identifierField]),
            );
        }

        return pairs.map((pair) =>
            createModelFromFields(
                pair,
                requestedFields,
                'PairModel',
                this.getTypenameMapping(),
            ),
        );
    }

    private getFiltersFromArgs(
        queryArguments: Record<string, any>,
        isFilteredQuery: boolean,
    ): PairFilterArgs | PairsFilter {
        const filters = isFilteredQuery
            ? plainToInstance(PairsFilter, queryArguments.filters, {
                  excludeExtraneousValues: true,
                  enableImplicitConversion: true,
                  exposeUnsetFields: false,
              })
            : plainToInstance(PairFilterArgs, queryArguments, {
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
    ): PairSortingArgs {
        return plainToInstance(PairSortingArgs, queryArguments.sorting, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            exposeUnsetFields: false,
        });
    }

    private filterPairs(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        pairs = PairFilteringService.pairsByIssuedLpToken(filters, pairs);
        pairs = PairFilteringService.pairsByAddress(filters, pairs);
        pairs = PairFilteringService.pairsByTokens(filters, pairs);
        pairs = PairFilteringService.pairsByState(filters, pairs);
        pairs = PairFilteringService.pairsByFeeState(filters, pairs);
        pairs = PairFilteringService.pairsByVolume(filters, pairs);
        pairs = PairFilteringService.pairsByLockedValueUSD(filters, pairs);

        if (!(filters instanceof PairsFilter)) {
            return pairs;
        }

        pairs = PairFilteringService.pairsByLpTokenIds(filters, pairs);
        // TODO: add pair related farm tokens to GlobalState.pairsEsdtTokens
        pairs = PairFilteringService.pairsByFarmTokens(
            filters,
            pairs,
            [], // replace with token IDs
        );
        pairs = PairFilteringService.pairsByTradesCount(filters, pairs);
        pairs = PairFilteringService.pairsByTradesCount24h(filters, pairs);
        pairs = PairFilteringService.pairsByHasFarms(filters, pairs);
        pairs = PairFilteringService.pairsByHasDualFarms(filters, pairs);
        pairs = PairFilteringService.pairsByDeployedAt(filters, pairs);

        return pairs;
    }

    private sortPairs(
        pairs: PairModel[],
        sortField: string,
        sortOrder: SortingOrder,
    ): PairModel[] {
        switch (sortField) {
            case PairSortableFields.DEPLOYED_AT:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.deployedAt).comparedTo(
                            b.deployedAt,
                        );
                    }
                    return new BigNumber(b.deployedAt).comparedTo(a.deployedAt);
                });
            case PairSortableFields.FEES_24:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.feesUSD24h).comparedTo(
                            b.feesUSD24h,
                        );
                    }
                    return new BigNumber(b.feesUSD24h).comparedTo(a.feesUSD24h);
                });
            case PairSortableFields.TRADES_COUNT:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.tradesCount).comparedTo(
                            b.tradesCount,
                        );
                    }
                    return new BigNumber(b.tradesCount).comparedTo(
                        a.tradesCount,
                    );
                });
            case PairSortableFields.TRADES_COUNT_24:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.tradesCount24h).comparedTo(
                            b.tradesCount24h,
                        );
                    }
                    return new BigNumber(b.tradesCount24h).comparedTo(
                        a.tradesCount24h,
                    );
                });
            case PairSortableFields.TVL:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.lockedValueUSD).comparedTo(
                            b.lockedValueUSD,
                        );
                    }
                    return new BigNumber(b.lockedValueUSD).comparedTo(
                        a.lockedValueUSD,
                    );
                });
            case PairSortableFields.VOLUME_24:
                return pairs.sort((a, b) => {
                    if (sortOrder === SortingOrder.ASC) {
                        return new BigNumber(a.volumeUSD24h).comparedTo(
                            b.volumeUSD24h,
                        );
                    }
                    return new BigNumber(b.volumeUSD24h).comparedTo(
                        a.volumeUSD24h,
                    );
                });
            case PairSortableFields.APR:
                return pairs.sort((a, b) => {
                    const aprA = new BigNumber(a.compoundedAPR.feesAPR)
                        .plus(a.compoundedAPR.farmBaseAPR)
                        .plus(a.compoundedAPR.farmBoostedAPR)
                        .plus(a.compoundedAPR.dualFarmBaseAPR)
                        .plus(a.compoundedAPR.dualFarmBoostedAPR);
                    const aprB = new BigNumber(b.compoundedAPR.feesAPR)
                        .plus(b.compoundedAPR.farmBaseAPR)
                        .plus(b.compoundedAPR.farmBoostedAPR)
                        .plus(b.compoundedAPR.dualFarmBaseAPR)
                        .plus(b.compoundedAPR.dualFarmBoostedAPR);
                    if (sortOrder === SortingOrder.ASC) {
                        return aprA.comparedTo(aprB);
                    }
                    return aprB.comparedTo(aprA);
                });
            default:
                return pairs;
        }
    }
}
