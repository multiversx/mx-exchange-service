import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    PersistenceInitService,
    PersistenceTasks,
} from './persistence.init.service';

@Injectable()
export class PersistenceCronService {
    constructor(
        private readonly persistenceInit: PersistenceInitService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async executeTasks(): Promise<void> {
        try {
            await this.persistenceInit.processQueuedTasks();
        } catch (error) {
            this.logger.error(error);
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async refreshAnalytics(): Promise<void> {
        try {
            await this.persistenceInit.queueTask({
                name: PersistenceTasks.REFRESH_ANALYTICS,
            });
        } catch (error) {
            this.logger.error(error);
        }
    }
}
