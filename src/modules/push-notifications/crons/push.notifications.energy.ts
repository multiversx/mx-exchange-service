import {
    AccountType,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable, Inject } from '@nestjs/common';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationsService } from '../services/push.notifications.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { pushNotificationsConfig, scAddress } from 'src/config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PushNotificationsEnergyCron {
    constructor(
        private readonly energyAbiService: EnergyAbiService,
        private readonly contextGetter: ContextGetterService,
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    @Lock({ name: 'feesCollectorRewardsCron', verbose: true })
    async feesCollectorRewardsCron() {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(
                String(scAddress.feesCollector),
            );

        if ((currentEpoch - firstWeekStartEpoch) % 7 !== 0) {
            return;
        }

        const isDevnet = process.env.NODE_ENV === 'devnet';

        if (isDevnet) {
            this.logger.log('Sending notifications for devnet', 'PushNotificationsEnergyCron');
            const addresses = await this.energyAbiService.getUsersWithEnergy();

            await this.pushNotificationsService.sendNotificationsInBatches(
                addresses,
                pushNotificationsConfig[
                    NotificationType.FEES_COLLECTOR_REWARDS
                ],
                NotificationType.FEES_COLLECTOR_REWARDS,
            );
            this.logger.log(`Sent ${addresses.length} notifications for devnet`, 'PushNotificationsEnergyCron');
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
                this.logger.log(`Sent ${addresses.length} notifications for mainnet`, 'PushNotificationsEnergyCron');
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
                this.logger.log(`Sent ${addresses.length} negative energy notifications`, 'PushNotificationsEnergyCron');
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
