import mongoose, { PipelineStage } from 'mongoose';
import { TradingContestParticipantDto } from '../dtos/contest.leaderboard.dto';

export const participantTokenStatsPipeline = (
    contestId: string,
    participantId: string,
    parameters: TradingContestParticipantDto,
): PipelineStage[] => {
    const {
        startTimestamp,
        endTimestamp,
        firstToken,
        secondToken,
        includeTradeCount,
    } = parameters;

    const matchStage: PipelineStage.Match = {
        $match: {
            contest: new mongoose.Types.ObjectId(contestId),
            participant: new mongoose.Types.ObjectId(participantId),
        },
    };

    if (firstToken && secondToken) {
        matchStage.$match.$or = [
            { tokenIn: firstToken, tokenOut: secondToken },
            { tokenIn: secondToken, tokenOut: firstToken },
        ];
    }

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
            _id: {
                tokenIn: '$tokenIn',
                tokenOut: '$tokenOut',
            },
            totalVolumeUSD: { $sum: '$volumeUSD' },
            ...(includeTradeCount && { tradeCount: { $sum: 1 } }),
        },
    };

    const projectStage: PipelineStage.Project = {
        $project: {
            _id: 0,
            tokenIn: '$_id.tokenIn',
            tokenOut: '$_id.tokenOut',
            totalVolumeUSD: 1,
        },
    };

    if (includeTradeCount) {
        projectStage.$project.tradeCount = 1;
    }

    return [
        matchStage,
        groupStage,
        projectStage,
        {
            $sort: { totalVolumeUSD: -1 },
        },
    ];
};
