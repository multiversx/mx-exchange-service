import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { XoxnoAggregatorAbiService } from 'src/modules/auto-router/services/xoxno-aggregator.abi.service';
import {
    XOXNO_MAX_CLAIM_TOKENS,
    XoxnoAggregatorTransactionService,
} from 'src/modules/auto-router/services/xoxno-aggregator.transactions.service';
import { Logger } from 'winston';
import { BroadcastStatus } from '../constants';
import { TaskRunnerTransactionService } from './task.runner.transaction.service';

@Injectable()
export class XoxnoTasksService {
    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly xoxnoAggregatorAbi: XoxnoAggregatorAbiService,
        private readonly xoxnoAggregatorTransaction: XoxnoAggregatorTransactionService,
        private readonly transactionService: TaskRunnerTransactionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async executeClaimReferralFeesTask(): Promise<void> {
        const referralID = this.apiConfigService.getXoxnoReferralID();
        if (!scAddress.xoxnoAggregator || referralID === undefined) {
            this.logger.warn(
                'XOXNO referral fees claim skipped - aggregator address or referral ID not configured',
                { context: XoxnoTasksService.name },
            );
            return;
        }

        const config = await this.xoxnoAggregatorAbi.referralConfig(referralID);
        if (!config) {
            this.logger.error(
                `XOXNO referral ${referralID} not found on the aggregator - check XOXNO_REFERRAL_ID`,
                { context: XoxnoTasksService.name },
            );
            return;
        }

        if (!config.active) {
            this.logger.warn(`XOXNO referral ${referralID} is inactive`, {
                context: XoxnoTasksService.name,
            });
        }

        this.logger.info(
            `Start claim referral fees task for XOXNO referral ${referralID} ` +
                `(owner ${config.owner}, fee ${config.fee} bps)`,
            { context: XoxnoTasksService.name },
        );

        const performance = new PerformanceProfiler();

        const balances =
            await this.xoxnoAggregatorAbi.referrerBalances(referralID);
        const claimable = balances.filter((balance) =>
            new BigNumber(balance.amount).isGreaterThan(0),
        );

        if (claimable.length === 0) {
            this.logger.info(
                `No XOXNO referral fees to claim for referral ${referralID}`,
                { context: XoxnoTasksService.name },
            );
            return;
        }

        this.logger.info(
            `Claimable XOXNO referral fees: ` +
                claimable.map((b) => `${b.amount} ${b.tokenID}`).join(', '),
            { context: XoxnoTasksService.name },
        );

        const txStats: Record<BroadcastStatus, number> = {
            success: 0,
            fail: 0,
            error: 0,
            skip: 0,
        };

        const tokenIDs = claimable.map((balance) => balance.tokenID);
        for (let i = 0; i < tokenIDs.length; i += XOXNO_MAX_CLAIM_TOKENS) {
            const batch = tokenIDs.slice(i, i + XOXNO_MAX_CLAIM_TOKENS);
            const status = await this.claimBatch(referralID, batch);
            txStats[status]++;
        }

        performance.stop();

        this.logger.info(
            `Finished claiming XOXNO referral fees for ${tokenIDs.length} tokens ` +
                `in ${performance.duration}ms | ${JSON.stringify(txStats)}`,
            { context: XoxnoTasksService.name },
        );

        if (txStats.error > 0) {
            throw new Error('Claim XOXNO referral fees task failed');
        }
    }

    private async claimBatch(
        referralID: number,
        tokenIDs: string[],
    ): Promise<BroadcastStatus> {
        try {
            const transaction =
                await this.xoxnoAggregatorTransaction.claimReferralFees(
                    this.transactionService.getSenderAddress(),
                    referralID,
                    tokenIDs,
                );

            const status =
                await this.transactionService.broadcastTransaction(transaction);

            if (status !== BroadcastStatus.success) {
                this.logger.error(
                    `Claim XOXNO referral fees transaction ended with status ${status} ` +
                        `for tokens ${tokenIDs.join(', ')}`,
                    { context: XoxnoTasksService.name },
                );
            }

            return status;
        } catch (error) {
            this.logger.error(
                `Encountered an error while building claim XOXNO referral fees transaction ` +
                    `for tokens ${tokenIDs.join(', ')}`,
                { context: XoxnoTasksService.name },
            );
            this.logger.error(error);

            return BroadcastStatus.error;
        }
    }
}
