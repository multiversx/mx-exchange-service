import { FilterQuery, PipelineStage } from 'mongoose';
import { SortingOrder } from 'src/modules/common/page.data';
import {
    TokensFilter,
    TokenSortingArgs,
    TokensSortableFields,
} from 'src/modules/tokens/models/tokens.filter.args';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';

export const filteredTokensPipeline = (
    offset: number,
    limit: number,
    filters: TokensFilter,
    sortArgs?: TokenSortingArgs,
): PipelineStage[] => {
    const initialStage: PipelineStage[] = [];
    const addFieldsStage: PipelineStage.AddFields = { $addFields: {} };
    const itemsFacet: PipelineStage.FacetPipelineStage[] = [];

    const sortField = sortArgs?.sortField ?? undefined;

    if (filters.minLiquidity || sortField === TokensSortableFields.LIQUIDITY) {
        addFieldsStage.$addFields.liquidityUSDNum = {
            $convert: {
                input: '$liquidityUSD',
                to: 'decimal',
                onError: 0,
                onNull: 0,
            },
        };
    }

    if (sortField === TokensSortableFields.PRICE) {
        addFieldsStage.$addFields.priceNum = {
            $convert: {
                input: '$price',
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

    if (sortField !== undefined) {
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

const convertSortArgs = (sortArgs: TokenSortingArgs): PipelineStage.Sort => {
    const sortMap: Record<TokensSortableFields, string> = {
        created_at: 'createdAtNum',
        liquidity: 'liquidityUSDNum',
        previous_24h_price: 'previous24hPriceNum',
        previous_24h_volume: 'previous24hVolumeNum',
        previous_7d_price: 'previous7dPriceNum',
        price: 'priceNum',
        price_change_24h: 'priceChange24h',
        price_change_7d: 'priceChange7d',
        trades_count: 'swapCount24h',
        trades_count_change_24h: 'tradeChange24h',
        trending_score: 'trendingScoreNum',
        volume: 'volumeUSD24hNum',
        volume_change_24h: 'volumeUSDChange24h',
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
    filter: TokensFilter,
): FilterQuery<EsdtTokenDocument> => {
    const query: FilterQuery<EsdtTokenDocument> = {};

    if (filter.identifiers && filter.identifiers.length > 0) {
        query.identifier = { $in: filter.identifiers };
    }

    if (filter.type !== undefined) {
        query.type = filter.type;
    }

    if (filter.minLiquidity !== undefined) {
        query.liquidityUSDNum = { $gte: filter.minLiquidity };
    }

    if (filter.searchToken && filter.searchToken.trim().length >= 1) {
        const searchTerm = filter.searchToken.toLowerCase().trim();
        const regex = `.*${searchTerm}.*`;
        query.$or = [
            {
                name: { $regex: regex, $options: 'i' },
            },
            {
                identifier: { $regex: regex, $options: 'i' },
            },
            {
                ticker: { $regex: regex, $options: 'i' },
            },
        ];
    }

    return query;
};
