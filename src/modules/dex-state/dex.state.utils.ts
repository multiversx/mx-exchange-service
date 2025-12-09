import { instanceToPlain } from 'class-transformer';
import { Token } from 'src/microservices/dex-state/interfaces/tokens.interfaces';
import { CacheService } from 'src/services/caching/cache.service';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import {
    StateTaskPriority,
    StateTasksWithArguments,
    TaskDto,
} from './entities';
import { STATE_TASKS_CACHE_KEY } from './services/state.tasks.service';
import {
    reverseTokenTypeMap,
    tokenTypeMap,
} from './services/tokens.state.service';

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

export function tokenToEsdtToken(token: Token): EsdtToken {
    return new EsdtToken({
        ...token,
        ...(token.type && {
            type: tokenTypeMap[token.type],
        }),
        // ...(!token.liquidityUSD && { liquidityUSD: '0' }),
        // ...(!token.previous24hPrice && { previous24hPrice: '0' }),
        // ...(!token.previous7dPrice && { previous7dPrice: '0' }),
        // ...(!token.previous24hSwapCount && { previous24hSwapCount: 0 }),
    });
}

export function esdtTokenToToken(token: EsdtToken): Token {
    return {
        ...token,
        ...(token.type && {
            type: reverseTokenTypeMap[token.type],
        }),
    };
}
