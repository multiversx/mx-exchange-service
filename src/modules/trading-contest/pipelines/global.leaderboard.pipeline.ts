import mongoose, { PipelineStage } from 'mongoose';
import { TradingContestLeaderboardDto } from '../dtos/contest.leaderboard.dto';

export const globalLeaderboardPipeline = (
    contestId: string,
    parameters: TradingContestLeaderboardDto,
): PipelineStage[] => {
    const {
        startTimestamp,
        endTimestamp,
        includeTradeCount,
        includeFees,
        includeRank,
        limit,
        offset,
    } = parameters;

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

    const groupStage: PipelineStage.Group = {
        $group: {
            _id: '$participant',
            totalVolumeUSD: { $sum: '$volumeUSD' },
            ...(includeTradeCount && { tradeCount: { $sum: 1 } }),
            ...(includeFees && { totalFeesUSD: { $sum: '$feesUSD' } }),
        },
    };

    const projectStage: PipelineStage.Project = {
        $project: {
            _id: 0,
            sender: '$_id',
            totalVolumeUSD: 1,
            ...(includeFees ? { totalFeesUSD: 1 } : {}),
            ...(includeTradeCount ? { tradeCount: 1 } : {}),
            ...(includeRank ? { rank: 1 } : {}),
        },
    };

    const resultsBranch: PipelineStage[] = [
        { $sort: { totalVolumeUSD: -1 as const } },
        ...(includeRank
            ? [
                  {
                      $setWindowFields: {
                          sortBy: { totalVolumeUSD: -1 as const },
                          output: { rank: { $rank: {} } },
                      },
                  } as PipelineStage.SetWindowFields,
              ]
            : []),
        projectStage,
        { $skip: offset },
        { $limit: limit },
    ];

    return [
        matchStage,
        groupStage,
        {
            $facet: {
                results: resultsBranch,
                total: [{ $count: 'count' }],
            },
        } as PipelineStage.Facet,
        {
            $project: {
                results: 1,
                totalCount: {
                    $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0],
                },
            },
        },
    ];
};
