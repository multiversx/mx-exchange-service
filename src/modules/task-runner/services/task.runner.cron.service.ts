import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { Logger } from 'winston';
import { FeesCollectorTasksService } from './fees.collector.tasks.service';

@Injectable()
export class TaskRunnerCronService {
    constructor(
        private readonly redLockService: RedlockService,
        private readonly feesCollectorTasks: FeesCollectorTasksService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    @LockAndRetry({
        lockKey: TaskRunnerCronService.name,
        lockName: 'swapTokens',
        maxLockRetries: 1,
        maxOperationRetries: 1,
    })
    async swapTokens(): Promise<void> {
        await this.feesCollectorTasks.executeSwapTokensTask();
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: TaskRunnerCronService.name,
        lockName: 'redistributeRewards',
        maxLockRetries: 1,
        maxOperationRetries: 3,
    })
    async redistributeRewards(): Promise<void> {
        await this.feesCollectorTasks.executeRedistributeRewardsTask();
    }
}
