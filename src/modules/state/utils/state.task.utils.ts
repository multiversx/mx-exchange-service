import { instanceToPlain } from 'class-transformer';
import { CacheService } from 'src/services/caching/cache.service';
import {
    PENDING_PRICE_UPDATES_KEY,
    StateTaskPriority,
    StateTasks,
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

        if (task.name === StateTasks.BROADCAST_PRICE_UPDATES) {
            if (task.args?.length) {
                const tokenIDs = JSON.parse(task.args[0]) as string[];
                await cacheService.addToSet(PENDING_PRICE_UPDATES_KEY, tokenIDs);
            }

            await cacheService.zAdd(
                STATE_TASKS_CACHE_KEY,
                JSON.stringify({ name: StateTasks.BROADCAST_PRICE_UPDATES }),
                StateTaskPriority[task.name],
            );
            continue;
        }

        const serializedTask = JSON.stringify(instanceToPlain(task));

        await cacheService.zAdd(
            STATE_TASKS_CACHE_KEY,
            serializedTask,
            StateTaskPriority[task.name],
        );
    }
}
