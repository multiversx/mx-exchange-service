import { instanceToPlain } from 'class-transformer';
import { CacheService } from 'src/services/caching/cache.service';
import {
    StateTaskPriority,
    StateTasksWithArguments,
    TaskDto,
} from '../entities/state.tasks.entities';
import { STATE_TASKS_CACHE_KEY } from '../services/state.tasks.service';

export async function queueStateTasks(
    cacheService: CacheService,
    tasks: TaskDto[],
): Promise<void> {
    for (const task of tasks) {
        if (StateTasksWithArguments.includes(task.name) && !task.args?.length) {
            throw new Error(`Task '${task.name}' requires an argument`);
        }

        const serializedTask = JSON.stringify(instanceToPlain(task));

        await cacheService.zAdd(
            STATE_TASKS_CACHE_KEY,
            serializedTask,
            StateTaskPriority[task.name],
        );
    }
}
