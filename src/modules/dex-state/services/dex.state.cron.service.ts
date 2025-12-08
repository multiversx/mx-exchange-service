import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { StateTasksService } from './state.tasks.service';

@Injectable()
export class DexStateCronService {
    constructor(
        private readonly taskService: StateTasksService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_SECONDS)
    async executeTasks(): Promise<void> {
        try {
            await this.taskService.processQueuedTasks();
        } catch (error) {
            this.logger.error(`${this.executeTasks.name} cron failed`, {
                context: StateTasksService.name,
                error,
            });
        }
    }

    // @Cron(CronExpression.EVERY_5_MINUTES)
    // async refreshAnalytics(): Promise<void> {

    // }
}
