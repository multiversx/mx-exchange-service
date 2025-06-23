import mongoose, { PipelineStage } from 'mongoose';

export const participantStatsPipeline = (
    contestId: string,
    participantId: string,
): PipelineStage[] => [
    { $match: { contest: new mongoose.Types.ObjectId(contestId) } },
    {
        $group: {
            _id: '$participant',
            totalVolumeUSD: { $sum: '$volumeUSD' },
            tradeCount: { $sum: 1 },
            totalFeesUSD: { $sum: '$feesUSD' },
        },
    },
    {
        $setWindowFields: {
            sortBy: { totalVolumeUSD: -1 },
            output: { rank: { $rank: {} } },
        },
    },
    { $match: { _id: new mongoose.Types.ObjectId(participantId) } },
    {
        $project: {
            _id: 0,
            totalVolumeUSD: { $ifNull: ['$totalVolumeUSD', 0] },
            tradeCount: { $ifNull: ['$tradeCount', 0] },
            totalFeesUSD: { $ifNull: ['$totalFeesUSD', 0] },
            rank: 1,
        },
    },
];
