import mongoose, { PipelineStage } from 'mongoose';
import { TradingContestParticipantDto } from '../dtos/contest.leaderboard.dto';

export const participantStatsPipeline = (
    contestId: string,
    participantId: string,
    parameters: TradingContestParticipantDto,
): PipelineStage[] => {
    const {
        startTimestamp,
        endTimestamp,
        includeTradeCount,
        includeFees,
        includeRank,
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
            totalVolumeUSD: { $ifNull: ['$totalVolumeUSD', 0] },
        },
    };

    if (includeFees) {
        projectStage.$project.totalFeesUSD = { $ifNull: ['$totalFeesUSD', 0] };
    }

    if (includeTradeCount) {
        projectStage.$project.tradeCount = { $ifNull: ['$tradeCount', 0] };
    }

    if (includeRank) {
        projectStage.$project.rank = 1;
    }

    return [
        matchStage,
        groupStage,
        {
            $setWindowFields: {
                sortBy: { totalVolumeUSD: -1 },
                output: { rank: { $rank: {} } },
            },
        },
        { $match: { _id: new mongoose.Types.ObjectId(participantId) } },
        projectStage,
    ];
};
