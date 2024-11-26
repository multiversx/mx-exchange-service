import { Injectable } from '@nestjs/common';
import { PairModel } from '../models/pair.model';
import {
    GlobalState,
    GlobalStateInitStatus,
} from 'src/modules/in-memory-store/entities/global.state';
import {
    PairFilterArgs,
    PairsFilter,
    PairSortableFields,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { PaginationArgs } from 'src/modules/dex.model';
import { QueryField } from 'src/modules/in-memory-store/entities/query.field.type';
import {
    createModelFromFields,
    parseFilteredQueryFields,
} from 'src/modules/in-memory-store/utils/graphql.utils';
import { plainToInstance } from 'class-transformer';
import ConnectionArgs, {
    getPagingParameters,
} from 'src/modules/common/filters/connection.args';
import { PairsResponse } from '../models/pairs.response';
import PageResponse from 'src/modules/common/page.response';
import BigNumber from 'bignumber.js';
import { SortingOrder } from 'src/modules/common/page.data';

@Injectable()
export class PairInMemoryStoreService {
    isReady(): boolean {
        return GlobalState.initStatus === GlobalStateInitStatus.DONE;
    }

    getData(): PairModel[] {
        return GlobalState.getPairsArray();
    }

    getSortedAndFilteredData(
        fields: QueryField[],
        queryArguments: Record<string, any>,
        isFilteredQuery = false,
    ): PairModel[] | PairsResponse {
        let pairs = GlobalState.getPairsArray();

        if (isFilteredQuery) {
            fields = parseFilteredQueryFields(fields);
        }

        const pagination = this.getPaginationFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const filters = this.getFiltersFromArgs(
            queryArguments,
            isFilteredQuery,
        );
        const sorting = this.getSortingFromArgs(queryArguments);

        pairs = this.filterPairs(pairs, filters, isFilteredQuery);

        if (!isFilteredQuery) {
            return pairs
                .map((pair) => createModelFromFields(pair, fields, 'PairModel'))
                .slice(pagination.offset, pagination.offset + pagination.limit);
        }

        if (sorting && sorting.sortField) {
            pairs = this.sortPairs(pairs, sorting.sortField, sorting.sortOrder);
        }

        const totalCount = pairs.length;

        return PageResponse.mapResponse<PairModel>(
            pairs
                .map((pair) => createModelFromFields(pair, fields, 'PairModel'))
                .slice(pagination.offset, pagination.offset + pagination.limit),
            this.getConnectionFromArgs(queryArguments) ?? new ConnectionArgs(),
            totalCount,
            pagination.offset,
            pagination.limit,
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
        isFilteredQuery: boolean,
    ): PairModel[] {
        pairs = this.filterByIssuedLpToken(pairs, filters);
        pairs = this.filterByAddresses(pairs, filters);
        pairs = this.filterByTokens(pairs, filters);
        pairs = this.filterByState(pairs, filters);
        pairs = this.filterByFeeState(pairs, filters);
        pairs = this.filterByVolume(pairs, filters);
        pairs = this.filterByLockedValueUSD(pairs, filters);

        if (!isFilteredQuery) {
            return pairs;
        }

        pairs = this.filterByTradesCount(pairs, filters as PairsFilter);
        pairs = this.filterByTradesCount24h(pairs, filters as PairsFilter);
        pairs = this.filterByLpTokenIds(pairs, filters as PairsFilter);
        pairs = this.filterByHasFarms(pairs, filters as PairsFilter);
        pairs = this.filterByHasDualFarms(pairs, filters as PairsFilter);
        pairs = this.filterByDeployedAt(pairs, filters as PairsFilter);

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

    private filterByIssuedLpToken(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (!filters.issuedLpToken) {
            return pairs;
        }

        return pairs.filter((pair) => pair.liquidityPoolToken !== undefined);
    }

    private filterByAddresses(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (!filters.addresses || filters.addresses.length === 0) {
            return pairs;
        }

        return pairs.filter((pair) => filters.addresses.includes(pair.address));
    }

    private filterByTokens(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (filters instanceof PairsFilter) {
            pairs = this.filterByWildcardToken(pairs, filters);
        }

        if (filters.firstTokenID) {
            if (filters.secondTokenID) {
                pairs = pairs.filter(
                    (pair) =>
                        (pair.firstToken.identifier === filters.firstTokenID &&
                            pair.secondToken.identifier ===
                                filters.secondTokenID) ||
                        (pair.firstToken.identifier === filters.secondTokenID &&
                            pair.secondToken.identifier ===
                                filters.firstTokenID),
                );
            } else {
                pairs = pairs.filter(
                    (pair) =>
                        pair.firstToken.identifier === filters.firstTokenID,
                );
            }
        } else if (filters.secondTokenID) {
            pairs = pairs.filter(
                (pair) => pair.secondToken.identifier === filters.secondTokenID,
            );
        }

        return pairs;
    }

    private filterByWildcardToken(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (!filters.searchToken || filters.searchToken.trim().length < 3) {
            return pairs;
        }

        const searchTerm = filters.searchToken.toUpperCase().trim();

        return pairs.filter(
            (pair) =>
                pair.firstToken.name.toUpperCase().includes(searchTerm) ||
                pair.firstToken.identifier.toUpperCase().includes(searchTerm) ||
                pair.firstToken.ticker.toUpperCase().includes(searchTerm) ||
                pair.secondToken.name.toUpperCase().includes(searchTerm) ||
                pair.secondToken.identifier
                    .toUpperCase()
                    .includes(searchTerm) ||
                pair.secondToken.ticker.toUpperCase().includes(searchTerm),
        );
    }

    private filterByState(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (
            !filters.state ||
            (Array.isArray(filters.state) && filters.state.length === 0)
        ) {
            return pairs;
        }

        return pairs.filter((pair) => {
            if (!Array.isArray(filters.state)) {
                return pair.state === filters.state;
            }

            return filters.state.includes(pair.state);
        });
    }

    private filterByFeeState(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (
            typeof filters.feeState === 'undefined' ||
            filters.feeState === null
        ) {
            return pairs;
        }

        return pairs.filter((pair) => pair.feeState === filters.feeState);
    }

    private filterByVolume(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (!filters.minVolume) {
            return pairs;
        }

        return pairs.filter((pair) => {
            const volume = new BigNumber(pair.volumeUSD24h);
            return volume.gte(filters.minVolume);
        });
    }

    private filterByLockedValueUSD(
        pairs: PairModel[],
        filters: PairFilterArgs | PairsFilter,
    ): PairModel[] {
        if (!filters.minLockedValueUSD) {
            return pairs;
        }

        return pairs.filter((pair) => {
            const lockedValueUSD = new BigNumber(pair.lockedValueUSD);
            return lockedValueUSD.gte(filters.minLockedValueUSD);
        });
    }

    private filterByTradesCount(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (!filters.minTradesCount) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.tradesCount >= filters.minTradesCount,
        );
    }

    private filterByTradesCount24h(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (!filters.minTradesCount24h) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.tradesCount24h >= filters.minTradesCount24h,
        );
    }

    private filterByHasFarms(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (
            typeof filters.hasFarms === 'undefined' ||
            filters.hasFarms === null
        ) {
            return pairs;
        }

        return pairs.filter((pair) => pair.hasFarms === filters.hasFarms);
    }

    private filterByHasDualFarms(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (
            typeof filters.hasDualFarms === 'undefined' ||
            filters.hasDualFarms === null
        ) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.hasDualFarms === filters.hasDualFarms,
        );
    }

    private filterByLpTokenIds(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (!filters.lpTokenIds || filters.lpTokenIds.length === 0) {
            return pairs;
        }

        return pairs.filter(
            (pair) =>
                pair.liquidityPoolToken !== undefined &&
                filters.lpTokenIds.includes(pair.liquidityPoolToken.identifier),
        );
    }

    private filterByDeployedAt(
        pairs: PairModel[],
        filters: PairsFilter,
    ): PairModel[] {
        if (!filters.minDeployedAt) {
            return pairs;
        }

        return pairs.filter((pair) => pair.deployedAt >= filters.minDeployedAt);
    }
}
