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
        },
    };

    if (includeFees) {
        projectStage.$project.totalFeesUSD = 1;
    }

    if (includeTradeCount) {
        projectStage.$project.tradeCount = 1;
    }

    if (includeRank) {
        projectStage.$project.rank = 1;
    }

    return [
        matchStage,
        groupStage,
        { $sort: { totalVolumeUSD: -1 as const } },
        {
            $setWindowFields: {
                sortBy: { totalVolumeUSD: -1 as const },
                output: { rank: { $rank: {} } },
            },
        },
        projectStage,
        { $skip: offset },
        { $limit: limit },
    ];
};
