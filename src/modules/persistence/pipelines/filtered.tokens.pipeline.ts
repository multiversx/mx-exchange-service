import { FilterQuery, PipelineStage } from 'mongoose';
import { SortingOrder } from 'src/modules/common/page.data';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
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
    const itemsFacet: PipelineStage.FacetPipelineStage[] = [];
    const addFields: PipelineStage.AddFields['$addFields'] = {};

    const sortField = sortArgs?.sortField ?? undefined;

    if (filters.minLiquidity || sortField === TokensSortableFields.LIQUIDITY) {
        addFields.liquidityUSDNum = convertToDecimalExpr('liquidityUSD');
    }

    if (sortField === TokensSortableFields.PRICE) {
        addFields.priceNum = convertToDecimalExpr('price');
    }

    if (sortField === TokensSortableFields.PREVIOUS_24H_PRICE) {
        addFields.previous24hPriceNum =
            convertToDecimalExpr('previous24hPrice');
    }

    if (sortField === TokensSortableFields.PREVIOUS_7D_PRICE) {
        addFields.previous7dPriceNum = convertToDecimalExpr('previous7dPrice');
    }

    if (sortField === TokensSortableFields.PREVIOUS_24H_VOLUME) {
        addFields.previous24hVolumeNum =
            convertToDecimalExpr('previous24hVolume');
    }

    if (sortField === TokensSortableFields.VOLUME) {
        addFields.volumeUSD24hNum = convertToDecimalExpr('volumeUSD24h');
    }

    if (sortField === TokensSortableFields.TRENDING_SCORE) {
        addFields.trendingScoreNum = convertToDecimalExpr('trendingScore');
    }

    if (sortField === TokensSortableFields.CREATED_AT) {
        addFields.createdAtNum = convertToDecimalExpr('createdAt');
    }

    if (Object.keys(addFields).length) {
        initialStage.push({
            $addFields: addFields,
        });
    }

    const matchQuery = convertFilterToQuery(filters);

    if (Object.keys(matchQuery ?? {}).length) {
        initialStage.push({ $match: matchQuery });
    }

    if (filters.enabledSwaps === true) {
        initialStage.push(...getActivePairsLookupStage());
    }

    if (sortField !== undefined) {
        itemsFacet.push(convertSortArgs(sortArgs));
    }

    itemsFacet.push({ $skip: offset }, { $limit: limit });

    itemsFacet.push({
        $project: {
            liquidityUSDNum: 0,
            priceNum: 0,
            previous24hPriceNum: 0,
            previous7dPriceNum: 0,
            previous24hVolumeNum: 0,
            volumeUSD24hNum: 0,
            trendingScoreNum: 0,
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

    query.type = EsdtTokenType.FungibleToken;

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

const convertToDecimalExpr = (field: string, onError = 0, onNull = 0) => {
    return {
        $convert: {
            input: `$${field}`,
            to: 'decimal',
            onError,
            onNull,
        },
    };
};

const getActivePairsLookupStage = () => {
    return [
        {
            $lookup: {
                from: 'pairs',
                let: { tokenId: '$identifier' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$state', 'Active'] },
                                    {
                                        $or: [
                                            {
                                                $eq: [
                                                    '$firstTokenId',
                                                    '$$tokenId',
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    '$secondTokenId',
                                                    '$$tokenId',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $project: { _id: 1 } },
                ],
                as: '__activePairs',
            },
        },
        { $match: { '__activePairs.0': { $exists: true } } },
        { $unset: '__activePairs' },
    ];
};
