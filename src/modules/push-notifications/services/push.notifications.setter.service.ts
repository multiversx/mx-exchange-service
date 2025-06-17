import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class PushNotificationsSetterService {
    private readonly failedNotificationsPrefix = 'pushNotificationsFailed';

    constructor(
        private readonly redisCacheService: RedisCacheService,
    ) {}

    async addFailedNotifications(
        addresses: string[],
        notificationKey: string,
        type: 'active' | 'stale',
        ttl: number = Constants.oneWeek(),
    ): Promise<void> {
        if (!addresses || addresses.length === 0) return;
        const redisKey = `${this.failedNotificationsPrefix}.${type}.${notificationKey}`;

        await this.redisCacheService.sadd(redisKey, ...addresses);
        await this.redisCacheService.expire(redisKey, ttl);
    }

    async getFailedNotifications(
        notificationKey: string,
        type: 'active' | 'stale',
        count = 1000,
    ): Promise<string[]> {
        const redisKey = `${this.failedNotificationsPrefix}.${type}.${notificationKey}`;
        return await this.redisCacheService['redis'].srandmember(
            redisKey,
            count,
        );
    }

    async removeFailedNotifications(
        addresses: string[],
        notificationKey: string,
        type: 'active' | 'stale',
    ): Promise<void> {
        if (!addresses || addresses.length === 0) return;

        const redisKey = `${this.failedNotificationsPrefix}.${type}.${notificationKey}`;
        await this.redisCacheService['redis'].srem(redisKey, ...addresses);
    }

    async setRateLimitHit(): Promise<void> {
        const redisKey = `${this.failedNotificationsPrefix}.rateLimitHit`;
        await this.redisCacheService.set(redisKey, true, Constants.oneMinute());
    }

    async isRateLimitHit(): Promise<boolean> {
        const redisKey = `${this.failedNotificationsPrefix}.rateLimitHit`;
        const result = await this.redisCacheService.get<boolean>(redisKey);

        return result === true;
    }
}
