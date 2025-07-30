import mongoose, { AccumulatorOperator, PipelineStage } from 'mongoose';
import { AggregationParamsDto } from '../dtos/contest.leaderboard.dto';

export const contestStatsPipeline = (
    contestId: string,
    parameters: AggregationParamsDto,
): PipelineStage[] => {
    const { startTimestamp, endTimestamp, includeTradeCount, includeFees } =
        parameters;

    const matchStage: PipelineStage.Match = {
        $match: {
            contest: new mongoose.Types.ObjectId(contestId),
            participant: { $ne: null },
        },
    };

    if (startTimestamp !== undefined || endTimestamp !== undefined) {
        matchStage.$match.timestamp = {};
        if (startTimestamp !== undefined) {
            matchStage.$match.timestamp.$gte = startTimestamp;
        }
        if (endTimestamp !== undefined) {
            matchStage.$match.timestamp.$lte = endTimestamp;
        }
    }

    const commonGroupStage: Record<string, AccumulatorOperator> = {
        totalVolumeUSD: { $sum: '$volumeUSD' },
        minTradeUSD: { $min: '$volumeUSD' },
        maxTradeUSD: { $max: '$volumeUSD' },
    };

    const participantsGroupStage: Record<string, AccumulatorOperator> = {
        participantsSet: {
            $addToSet: {
                $cond: [
                    { $ne: ['$participant', null] },
                    '$participant',
                    '$$REMOVE',
                ],
            },
        },
    };

    const commonProjectStage: Record<string, any> = {
        totalVolumeUSD: 1,
        minTradeUSD: 1,
        maxTradeUSD: 1,
    };

    if (includeTradeCount) {
        commonGroupStage.tradeCount = { $sum: 1 };

        commonProjectStage.tradeCount = 1;
        commonProjectStage.averageTradeUSD = {
            $cond: [
                { $gt: ['$tradeCount', 0] },
                {
                    $divide: ['$totalVolumeUSD', '$tradeCount'],
                },
                0,
            ],
        };
    }

    if (includeFees) {
        commonGroupStage.totalFeesUSD = { $sum: '$feesUSD' };
        commonProjectStage.totalFeesUSD = 1;
    }

    const participantsProjectStage: Record<string, any> = {
        distinctParticipants: {
            $size: { $ifNull: ['$participantsSet', []] },
        },
    };

    return [
        matchStage,
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            ...participantsGroupStage,
                            ...commonGroupStage,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            ...participantsProjectStage,
                            ...commonProjectStage,
                        },
                    },
                ],

                bySwapType: [
                    {
                        $group: {
                            _id: '$swapType',
                            ...commonGroupStage,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            swapType: '$_id',
                            ...commonProjectStage,
                        },
                    },
                    { $sort: { swapType: 1 } },
                ],

                daily: [
                    {
                        $addFields: {
                            tsDate: {
                                $toDate: { $multiply: ['$timestamp', 1000] },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateTrunc: {
                                    date: '$tsDate',
                                    unit: 'day',
                                },
                            },
                            ...participantsGroupStage,
                            ...commonGroupStage,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            date: '$_id',
                            ...participantsProjectStage,
                            ...commonProjectStage,
                        },
                    },
                    { $sort: { date: 1 } },
                ],
            },
        },
        {
            $project: {
                summary: {
                    $ifNull: [
                        { $arrayElemAt: ['$summary', 0] },
                        {
                            totalVolumeUSD: 0,
                            totalFeesUSD: 0,
                            tradeCount: 0,
                            averageTradeUSD: 0,
                            minTradeUSD: 0,
                            maxTradeUSD: 0,
                            distinctParticipants: 0,
                        },
                    ],
                },
                bySwapType: 1,
                daily: 1,
            },
        },
    ];
};
