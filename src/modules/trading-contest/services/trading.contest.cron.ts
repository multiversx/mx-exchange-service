import { Inject, Injectable } from '@nestjs/common';
import { TradingContestService } from './trading.contest.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { TradingContestSwapDocument } from '../schemas/trading.contest.swap.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class TradingContestCronService {
    constructor(
        private readonly tradingContestService: TradingContestService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    @LockAndRetry({
        lockKey: 'TradingContestCron',
        lockName: 'updateContestParticipantForSwaps',
    })
    async updateContestParticipantForSwaps(): Promise<void> {
        const swaps =
            await this.tradingContestService.getSwapsWithoutParticipant();

        if (!swaps || swaps.length === 0) {
            return;
        }

        const swapsByHash: Record<string, TradingContestSwapDocument[]> = {};
        swaps.forEach((swap) => {
            if (swapsByHash[swap.txHash]) {
                swapsByHash[swap.txHash].push(swap);
            } else {
                swapsByHash[swap.txHash] = [swap];
            }
        });

        const deleteIds = [];
        const bulkOps = [];
        for (const hash of Object.keys(swapsByHash)) {
            const sender =
                await this.tradingContestService.getSenderFromElastic(hash);

            if (sender === undefined) {
                this.logger.warn(
                    `Could not extract sender for hash ${hash}. Will delete all swaps`,
                );
                deleteIds.push(...swapsByHash[hash].map((s) => s._id));
                continue;
            }

            for (const swap of swapsByHash[hash]) {
                if (
                    swap.contest === null ||
                    swap.contest instanceof mongoose.Schema.Types.ObjectId
                ) {
                    this.logger.warn(
                        `Contest for swap ${swap._id} is not populated. Will delete swap`,
                    );
                    deleteIds.push(swap._id);
                    continue;
                }

                const participant =
                    await this.tradingContestService.getOrCreateContestParticipant(
                        swap.contest,
                        sender,
                    );

                if (!participant) {
                    this.logger.warn(
                        `No participant for swap ${swap._id}. Will delete swap`,
                    );
                    deleteIds.push(swap._id);
                    continue;
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: swap._id },
                        update: {
                            $set: {
                                participant: participant._id,
                            },
                        },
                    },
                });
            }
        }

        if (deleteIds.length > 0) {
            bulkOps.push({
                deleteMany: { filter: { _id: deleteIds } },
            });
        }

        await this.tradingContestService.bulkUpdateSwaps(bulkOps);
    }
}
