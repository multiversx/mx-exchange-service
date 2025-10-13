import { FilterQuery, PipelineStage } from 'mongoose';
import { SortingOrder } from 'src/modules/common/page.data';
import {
    PairsFilter,
    PairSortableFields,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { PairDocument } from '../schemas/pair.schema';

export const filteredPairsPipeline = (
    offset: number,
    limit: number,
    filters: PairsFilter,
    sortArgs?: PairSortingArgs,
): PipelineStage[] => {
    const initialStage: PipelineStage[] = [];
    const addFieldsStage: PipelineStage.AddFields = { $addFields: {} };
    const itemsFacet: PipelineStage.FacetPipelineStage[] = [];

    if (
        filters.minVolume ||
        (sortArgs && sortArgs.sortField === PairSortableFields.VOLUME_24)
    ) {
        addFieldsStage.$addFields.volumeUSD24hNum = {
            $convert: {
                input: '$volumeUSD24h',
                to: 'decimal',
                onError: 0,
                onNull: 0,
            },
        };
    }

    if (
        filters.minLockedValueUSD ||
        (sortArgs && sortArgs.sortField === PairSortableFields.TVL)
    ) {
        addFieldsStage.$addFields.lockedValueUSDNum = {
            $convert: {
                input: '$lockedValueUSD',
                to: 'decimal',
                onError: 0,
                onNull: 0,
            },
        };
    }

    if (sortArgs && sortArgs.sortField === PairSortableFields.FEES_24) {
        addFieldsStage.$addFields.feesUSD24hNum = {
            $convert: {
                input: '$feesUSD24h',
                to: 'decimal',
                onError: 0,
                onNull: 0,
            },
        };
    }

    if (Object.keys(addFieldsStage.$addFields).length) {
        initialStage.push(addFieldsStage);
    }

    const matchQuery = convertFilterToQuery(filters);

    if (Object.keys(matchQuery ?? {}).length) {
        initialStage.push({ $match: matchQuery });
    }

    if (sortArgs !== undefined) {
        itemsFacet.push(convertSortArgs(sortArgs));
    }

    itemsFacet.push({ $skip: offset }, { $limit: limit });

    itemsFacet.push({
        $project: {
            feesUSD24hNum: 0,
            lockedValueUSDNum: 0,
            volumeUSD24hNum: 0,
        },
    });

    return [
        ...initialStage,
        {
            $facet: {
                items: itemsFacet,
                total: [{ $count: 'count' }],
            },
        },
        {
            $project: {
                items: 1,
                total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
            },
        },
    ];
};

const convertSortArgs = (sortArgs: PairSortingArgs): PipelineStage.Sort => {
    const sortMap: Record<PairSortableFields, string> = {
        apr: 'compoundedApr',
        deployed_at: 'deployedAt',
        fees_24h: 'feesUSD24hNum',
        total_value_locked: 'lockedValueUSDNum',
        trades_count_24h: 'tradesCount24h',
        trades_count: 'tradesCount',
        volume_24h: 'volumeUSD24hNum',
    };

    const field = sortMap[sortArgs.sortField];
    const order = sortArgs.sortOrder === SortingOrder.ASC ? 1 : -1;

    return {
        $sort: {
            [field]: order,
            _id: 1,
        },
    };
};

const convertFilterToQuery = (
    filter: PairsFilter,
): FilterQuery<PairDocument> => {
    const query: FilterQuery<PairDocument> = {};

    if (filter.issuedLpToken === true) {
        query.liquidityPoolToken = { $ne: null };
    }

    if (filter.addresses && filter.addresses.length > 0) {
        query.address = { $in: filter.addresses };
    }

    // if (filter.searchToken && filter.searchToken.trim().length >= 1) {
    //     const searchTerm = filter.searchToken.toUpperCase().trim();

    //     query.$or = [
    //       {firstTokenId: {$includes}}
    //     ]
    // }

    if (filter.lpTokenIds && filter.lpTokenIds.length > 0) {
        query.liquidityPoolTokenId = { $in: filter.lpTokenIds };
    }

    if (filter.state && filter.state.length > 0) {
        query.state = { $in: filter.state };
    }

    if (filter.feeState !== undefined && filter.feeState !== null) {
        query.feeState = filter.feeState;
    }

    if (filter.minVolume !== undefined) {
        query.volumeUSD24hNum = { $gte: filter.minVolume };
    }

    if (filter.minLockedValueUSD !== undefined) {
        query.lockedValueUSDNum = { $gte: filter.minLockedValueUSD };
    }

    if (filter.minTradesCount !== undefined) {
        query.tradesCount = { $gte: filter.minTradesCount };
    }

    if (filter.minTradesCount24h !== undefined) {
        query.tradesCount24h = { $gte: filter.minTradesCount24h };
    }

    if (filter.hasFarms !== undefined && filter.hasFarms !== null) {
        query.hasFarms = filter.hasFarms;
    }

    if (filter.hasDualFarms !== undefined && filter.hasDualFarms !== null) {
        query.hasDualFarms = filter.hasFarms;
    }

    if (filter.minDeployedAt !== undefined) {
        query.deployedAt = { $gte: filter.minDeployedAt };
    }

    return query;
};
