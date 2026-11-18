import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { Logger } from 'winston';
import { FeesCollectorTasksService } from './fees.collector.tasks.service';
import { XoxnoTasksService } from './xoxno.tasks.service';

@Injectable()
export class TaskRunnerCronService {
    constructor(
        private readonly redLockService: RedlockService,
        private readonly feesCollectorTasks: FeesCollectorTasksService,
        private readonly xoxnoTasks: XoxnoTasksService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    @LockAndRetry({
        lockKey: TaskRunnerCronService.name,
        lockName: 'swapTokens',
        maxLockRetries: 0,
        maxOperationRetries: 1,
    })
    async swapTokens(): Promise<void> {
        await this.feesCollectorTasks.executeSwapTokensTask();
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: TaskRunnerCronService.name,
        lockName: 'redistributeRewards',
        maxLockRetries: 0,
        maxOperationRetries: 3,
    })
    async redistributeRewards(): Promise<void> {
        await this.feesCollectorTasks.executeRedistributeRewardsTask();
    }

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    @LockAndRetry({
        lockKey: TaskRunnerCronService.name,
        lockName: 'claimXoxnoReferralFees',
        maxLockRetries: 0,
        maxOperationRetries: 2,
    })
    async claimXoxnoReferralFees(): Promise<void> {
        await this.xoxnoTasks.executeClaimReferralFeesTask();
    }
}
