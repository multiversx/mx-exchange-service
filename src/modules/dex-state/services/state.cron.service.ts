import { Lock } from '@multiversx/sdk-nestjs-common';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { StateTasksService } from './state.tasks.service';

@Injectable()
export class StateCronService {
    constructor(
        private readonly taskService: StateTasksService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_SECONDS)
    async executeStateTasks(): Promise<void> {
        try {
            await this.taskService.processQueuedTasks();
        } catch (error) {
            this.logger.error(`${this.executeStateTasks.name} cron failed`, {
                context: StateTasksService.name,
                error,
            });
        }
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    @Lock({ name: 'refreshStateAnalytics', verbose: true })
    async refreshStateAnalytics(): Promise<void> {
        try {
            await this.taskService.refreshAnalytics();
        } catch (error) {
            this.logger.error(
                `${this.refreshStateAnalytics.name} cron failed`,
                {
                    context: StateCronService.name,
                    error,
                },
            );
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'updateStateSnapshot', verbose: true })
    async updateStateSnapshot(): Promise<void> {
        try {
            await this.taskService.updateSnapshot();
        } catch (error) {
            this.logger.error(`${this.updateStateSnapshot.name} cron failed`, {
                context: StateCronService.name,
                error,
            });
        }
    }
}
