import { instanceToPlain } from 'class-transformer';
import { CacheService } from 'src/services/caching/cache.service';
import { PairModel } from '../pair/models/pair.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import {
    StateTaskPriority,
    StateTasksWithArguments,
    TaskDto,
} from './entities';
import { STATE_TASKS_CACHE_KEY } from './services/state.tasks.service';

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

export function formatToken(
    token: EsdtToken,
    fields: (keyof EsdtToken)[] = [],
): EsdtToken {
    if (fields.length === 0) {
        return new EsdtToken({
            ...token,
            ...(!token.liquidityUSD && { liquidityUSD: '0' }),
            ...(!token.previous24hPrice && { previous24hPrice: '0' }),
            ...(!token.previous7dPrice && { previous7dPrice: '0' }),
            ...(!token.previous24hSwapCount && { previous24hSwapCount: 0 }),
            ...(!token.volumeUSD24h && { volumeUSD24h: '0' }),
        });
    }

    return new EsdtToken({
        ...token,
        ...(fields.includes('liquidityUSD') && {
            liquidityUSD: token.liquidityUSD ?? '0',
        }),
        ...(fields.includes('previous24hPrice') && {
            previous24hPrice: token.previous24hPrice ?? '0',
        }),
        ...(fields.includes('previous7dPrice') && {
            previous7dPrice: token.previous7dPrice ?? '0',
        }),
        ...(fields.includes('previous24hSwapCount') && {
            previous24hSwapCount: token.previous24hSwapCount ?? 0,
        }),
        ...(fields.includes('volumeUSD24h') && {
            volumeUSD24h: token.volumeUSD24h ?? '0',
        }),
    });
}

export function formatPair(
    pair: PairModel,
    fields: (keyof PairModel)[],
): PairModel {
    if (fields.length === 0) {
        return new PairModel({
            ...pair,
            trustedSwapPairs: pair.trustedSwapPairs ?? [],
            feeDestinations: pair.feeDestinations ?? [],
            whitelistedManagedAddresses: pair.whitelistedManagedAddresses ?? [],
        });
    }

    return new PairModel({
        ...pair,
        ...(fields.includes('trustedSwapPairs') && {
            trustedSwapPairs: pair.trustedSwapPairs ?? [],
        }),
        ...(fields.includes('feeDestinations') && {
            feeDestinations: pair.feeDestinations ?? [],
        }),
        ...(fields.includes('whitelistedManagedAddresses') && {
            whitelistedManagedAddresses: pair.whitelistedManagedAddresses ?? [],
        }),
    });
}
