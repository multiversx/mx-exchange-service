import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { PushNotificationsService } from '../services/push.notifications.service';
import {
    AccountType,
    NotificationType,
} from '../models/push.notifications.types';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Injectable()
export class PushNotificationsEnergyCron {
    constructor(
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly contextGetter: ContextGetterService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
    ) {}

    @Cron('0 0 19 * * 5') // Every Friday at 19:00
    @Lock({ name: 'feesCollectorRewardsCron', verbose: true })
    async feesCollectorRewardsCron() {
        const isDevnet = process.env.NODE_ENV === 'devnet';

        if (isDevnet) {
            const addresses =
                await this.pushNotificationsService.usersWithEnergyFromContractStorage();

            await this.pushNotificationsService.sendNotifications(
                addresses,
                NotificationType.FEES_COLLECTOR_REWARDS,
            );
            return;
        }

        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            currentEpoch - 1,
            'gt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                await this.pushNotificationsService.sendNotifications(
                    addresses,
                    NotificationType.FEES_COLLECTOR_REWARDS,
                );
            },
        );
    }

    @Cron('0 12 */2 * *') // Every 2 days at noon
    @Lock({ name: 'negativeEnergyNotificationsCron', verbose: true })
    async negativeEnergyNotificationsCron() {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            currentEpoch - 1,
            'lt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                await this.pushNotificationsService.sendNotifications(
                    addresses,
                    NotificationType.NEGATIVE_ENERGY,
                );
            },
            0,
        );
    }

    @Cron('*/1 * * * *') // Every 10 minutes
    @Lock({ name: 'retryFailedNotificationsCron', verbose: true })
    async retryFailedNotificationsCron() {
        const notificationTypes = Object.values(NotificationType);

        for (const notificationType of notificationTypes) {
            await this.pushNotificationsService.retryFailedNotifications(
                notificationType,
            );
        }
    }
}
