import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { UserEnergyAddress } from '../models/push.notifications.model';

@Injectable()
export class PushNotificationsSetterService {
    private readonly cacheKey = 'userEnergyAddresses';

    constructor(private readonly cacheService: CacheService) {}

    async setUsersInCache(users: UserEnergyAddress[]): Promise<void> {
        await this.cacheService.set(
            this.cacheKey,
            users,
            Constants.oneWeek(),
            Constants.oneDay() * 6,
        );
    }

    async getUsersFromCache(): Promise<UserEnergyAddress[] | null> {
        const users = await this.cacheService.get<UserEnergyAddress[]>(
            this.cacheKey,
        );

        if (!users) return null;

        return users;
    }

    async updateNotificationStatus(
        addresses: string[],
        status: boolean,
    ): Promise<void> {
        const users = await this.getUsersFromCache();

        if (!users) return;

        const updatedUsers = users.map((user) =>
            addresses.includes(user.address)
                ? { ...user, notificationSent: status }
                : user,
        );

        await this.setUsersInCache(updatedUsers);
    }

    async clearCache(): Promise<void> {
        await this.cacheService.delete(this.cacheKey);
    }
}
