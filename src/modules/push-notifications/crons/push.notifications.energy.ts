import {
    AccountType,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable } from '@nestjs/common';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationsService } from '../services/push.notifications.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { pushNotificationsConfig } from 'src/config';

@Injectable()
export class PushNotificationsEnergyCron {
    constructor(
        private readonly energyAbiService: EnergyAbiService,
        private readonly contextGetter: ContextGetterService,
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    @Lock({ name: 'feesCollectorRewardsCron', verbose: true })
    async feesCollectorRewardsCron() {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const feesCollector = pushNotificationsConfig.feesCollector;

        if ((currentEpoch - feesCollector.firstWeekStartEpoch) % 7 !== 0) {
            return;
        }

        const isDevnet = process.env.NODE_ENV === 'devnet';
        console.log('isDevnet', isDevnet);

        if (isDevnet) {
            console.log('Sending notifications for devnet');
            const addresses = await this.energyAbiService.getUsersWithEnergy();

            await this.pushNotificationsService.sendNotificationsInBatches(
                addresses,
                pushNotificationsConfig[
                    NotificationType.FEES_COLLECTOR_REWARDS
                ],
                NotificationType.FEES_COLLECTOR_REWARDS,
            );
            return;
        }

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            currentEpoch - 1,
            'gt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                await this.pushNotificationsService.sendNotificationsInBatches(
                    addresses,
                    pushNotificationsConfig[
                        NotificationType.FEES_COLLECTOR_REWARDS
                    ],
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

                await this.pushNotificationsService.sendNotificationsInBatches(
                    addresses,
                    pushNotificationsConfig[NotificationType.NEGATIVE_ENERGY],
                    NotificationType.NEGATIVE_ENERGY,
                );
            },
            0,
        );
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
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
