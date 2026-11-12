import { Inject, Injectable, Module } from '@nestjs/common';
import { Args, Query, Resolver, Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

export const STUB_EVENT = 'edgeEvent';
export const STUB_CACHE_BASE_KEY = 'edgeStub';
export const STUB_INTERNAL_ERROR = 'edge stub internal failure';

@Injectable()
export class EdgeStubService {
    private computations = 0;

    // A new value per computation, so cache hits are visible to callers.
    @GetOrSetCache({ baseKey: STUB_CACHE_BASE_KEY, remoteTtl: 60 })
    async cachedValue(key: string): Promise<string> {
        this.computations++;
        return `${key}:${this.computations}`;
    }
}

@Resolver()
export class EdgeStubResolver {
    constructor(
        private readonly stubService: EdgeStubService,
        @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    ) {}

    @Query(() => String)
    cachedValue(@Args('key') key: string): Promise<string> {
        return this.stubService.cachedValue(key);
    }

    @Query(() => String)
    echo(
        @Args('text') text: string,
        @Args('items', { type: () => [String], nullable: true })
        items?: string[],
    ): string {
        return [text, ...(items ?? [])].join(',');
    }

    @Query(() => String)
    failing(): string {
        throw new Error(STUB_INTERNAL_ERROR);
    }

    @Subscription(() => String)
    edgeEvent() {
        return this.pubSub.asyncIterator(STUB_EVENT);
    }

    // Fails while the subscription is being set up.
    @Subscription(() => String)
    failingSubscription(): AsyncIterableIterator<string> {
        throw new Error(STUB_INTERNAL_ERROR);
    }

    // Starts, then fails while streaming.
    @Subscription(() => String)
    failingStream(): AsyncIterableIterator<string> {
        return {
            next: () => Promise.reject(new Error(STUB_INTERNAL_ERROR)),
            return: () => Promise.resolve({ value: undefined, done: true }),
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}

@Module({
    providers: [EdgeStubService, EdgeStubResolver],
})
export class EdgeStubModule {}
