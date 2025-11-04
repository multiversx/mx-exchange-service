import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { RunnerTasks, TRIGGER_TASK_EVENT } from './constants';
import { FeesCollectorTasksService } from './services/fees.collector.tasks.service';

@Controller()
export class TaskRunnerController {
    constructor(
        private readonly feesCollectorTaskService: FeesCollectorTasksService,
    ) {}

    @EventPattern(TRIGGER_TASK_EVENT)
    async handleTriggerTask(task: RunnerTasks): Promise<void> {
        switch (task) {
            case RunnerTasks.FEES_COLLECTOR_REDISTRIBUTE_REWARDS:
                await this.feesCollectorTaskService.executeRedistributeRewardsTask(
                    true,
                );
                break;
            case RunnerTasks.SWAP_TOKENS:
                await this.feesCollectorTaskService.executeSwapTokensTask();
                break;
            default:
                break;
        }
    }
}
