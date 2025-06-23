import mongoose, { PipelineStage } from 'mongoose';

export const globalLeaderboardPipeline = (
    limit = 100,
    contest: string,
): PipelineStage[] => [
    /* 1. filter by contest */
    { $match: { contest: new mongoose.Types.ObjectId(contest) } },

    /* 2. crunch the numbers for each wallet */
    {
        $group: {
            _id: '$participant',
            totalVolumeUSD: { $sum: '$volumeUSD' },
            tradeCount: { $sum: 1 },
            totalFeesUSD: { $sum: '$feesUSD' },
        },
    },

    /* 3. order by biggest volume */
    { $sort: { totalVolumeUSD: -1 as -1 } },

    /* 4. apply a window-function rank */
    {
        $setWindowFields: {
            sortBy: { totalVolumeUSD: -1 as -1 },
            output: { rank: { $rank: {} } },
        },
    },

    /* 5. reshape the document */
    {
        $project: {
            _id: 0,
            sender: '$_id',
            totalVolumeUSD: 1,
            tradeCount: 1,
            totalFeesUSD: 1,
            rank: 1,
        },
    },

    /* 6. cut the response down to size */
    { $limit: limit },
];
