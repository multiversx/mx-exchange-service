import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class PushNotificationsSetterService {
    private readonly failedNotificationsPrefix = 'pushNotificationsFailed';

    constructor(private readonly cacheService: CacheService) {}

    async addFailedNotifications(
        addresses: string[],
        notificationKey: string,
        ttl: number = Constants.oneWeek(),
    ): Promise<void> {
        if (!addresses || addresses.length === 0) return;
        const redisKey = `${this.failedNotificationsPrefix}.${notificationKey}`;

        await this.cacheService.addToSet(redisKey, addresses);
        await this.cacheService.setTtlRemote(redisKey, ttl);
    }

    async getFailedNotifications(notificationKey: string): Promise<string[]> {
        const redisKey = `${this.failedNotificationsPrefix}.${notificationKey}`;
        return await this.cacheService.getSetMembers(redisKey);
    }

    async removeFailedNotifications(
        addresses: string[],
        notificationKey: string,
    ): Promise<void> {
        if (!addresses || addresses.length === 0) return;

        const redisKey = `${this.failedNotificationsPrefix}.${notificationKey}`;
        await this.cacheService.removeFromSet(redisKey, addresses);
    }
}
