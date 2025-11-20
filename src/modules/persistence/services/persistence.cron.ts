import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PersistenceTasks, TaskDto } from '../entities';
import { PersistenceService } from './persistence.service';

@Injectable()
export class PersistenceCronService {
    constructor(
        private readonly persistenceService: PersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async executeTasks(): Promise<void> {
        try {
            await this.persistenceService.processQueuedTasks();
        } catch (error) {
            this.logger.error(`${this.executeTasks.name} cron failed`, {
                context: PersistenceCronService.name,
                error,
            });
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async refreshAnalytics(): Promise<void> {
        try {
            await this.persistenceService.queueTasks([
                new TaskDto({
                    name: PersistenceTasks.REFRESH_ANALYTICS,
                }),
            ]);
        } catch (error) {
            this.logger.error(`${this.refreshAnalytics.name} cron failed`, {
                context: PersistenceCronService.name,
                error,
            });
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async refreshWeekTimekeeping(): Promise<void> {
        try {
            await this.persistenceService.queueTasks([
                new TaskDto({
                    name: PersistenceTasks.REFRESH_WEEK_TIMEKEEPING,
                }),
            ]);
        } catch (error) {
            this.logger.error(
                `${this.refreshWeekTimekeeping.name} cron failed`,
                {
                    context: PersistenceCronService.name,
                    error,
                },
            );
        }
    }
}
