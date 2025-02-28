import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from './redis.pubSub.module';

@Injectable()
export class RedisKeyWatcherService implements OnModuleInit {
    private isProcessing = false;

    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async onModuleInit() {
        await this.setupKeyWatching();
    }

    private async setupKeyWatching() {
        const publisher = this.pubSub.getPublisher();
        const subscriber = this.pubSub.getSubscriber();

        await publisher.config('SET', 'notify-keyspace-events', 'KEA');
        const key = 'token.tokenMetadata.*';
        const subscriptionPattern = `__keyspace@0__:${key}`;

        subscriber.on('pmessage', async (pattern, channel, event) => {
            if (this.isProcessing) return;

            try {
                this.isProcessing = true;
                if (event === 'set') {
                    const redisKey = channel.split(':').slice(1).join(':');
                    const newValue = await publisher.get(redisKey);
                    if (newValue) {
                        await this.pubSub.publish('REDIS_KEY_CHANGED', JSON.parse(newValue));
                    }
                }
            } finally {
                this.isProcessing = false;
            }
        });

        await subscriber.psubscribe(subscriptionPattern);
    }
}