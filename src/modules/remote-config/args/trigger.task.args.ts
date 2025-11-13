import { IsEnum, IsNotEmpty } from 'class-validator';
import { RunnerTasks } from 'src/modules/task-runner/constants';

export class TriggerTaskArgs {
    @IsNotEmpty()
    @IsEnum(RunnerTasks)
    task: RunnerTasks;
}
