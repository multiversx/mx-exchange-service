import {
    AccountType,
    NotificationType,
    NotificationResultCount,
    NotificationConfig,
} from '../models/push.notifications.types';
import { Inject, Injectable } from '@nestjs/common';
import { PushNotificationsService } from './push.notifications.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { pushNotificationsConfig } from 'src/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PushNotificationsEnergyService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async feesCollectorRewardsNotification(
        targetEpoch: number,
    ): Promise<NotificationResultCount> {
        this.logger.info(
            `Fees collector rewards notification started for epoch: ${targetEpoch}`,
            { context: PushNotificationsEnergyService.name },
        );

        let successfulNotifications = 0;
        let failedNotifications = 0;

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            targetEpoch,
            'gt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                const result =
                    await this.pushNotificationsService.sendNotificationsInBatches(
                        addresses,
                        pushNotificationsConfig[
                            NotificationType.FEES_COLLECTOR_REWARDS
                        ],
                        NotificationType.FEES_COLLECTOR_REWARDS,
                    );

                successfulNotifications += result.successful;
                failedNotifications += result.failed;
            },
        );

        this.logger.info(
            `Fees collector rewards notification completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            { context: PushNotificationsEnergyService.name },
        );

        return {
            successful: successfulNotifications,
            failed: failedNotifications,
        };
    }

    async customNotificationForUsersWithEnergy(
        notificationConfig: NotificationConfig,
        notificationKey: string,
        targetEpoch: number,
    ): Promise<NotificationResultCount> {
        this.logger.info(
            `Started sending custom notification for users with energy in epoch: ${targetEpoch}`,
            { context: PushNotificationsEnergyService.name },
        );

        let successfulNotifications = 0;
        let failedNotifications = 0;

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            targetEpoch,
            'gt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                const result =
                    await this.pushNotificationsService.sendNotificationsInBatches(
                        addresses,
                        notificationConfig,
                        notificationKey,
                    );

                successfulNotifications += result.successful;
                failedNotifications += result.failed;
            },
        );

        this.logger.info(
            `Finished sending custom notification. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            { context: PushNotificationsEnergyService.name },
        );

        return {
            successful: successfulNotifications,
            failed: failedNotifications,
        };
    }

    async negativeEnergyNotifications(): Promise<void> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        let successfulNotifications = 0;
        let failedNotifications = 0;

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            currentEpoch - 1,
            'lt',
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );

                const result =
                    await this.pushNotificationsService.sendNotificationsInBatches(
                        addresses,
                        pushNotificationsConfig[
                            NotificationType.NEGATIVE_ENERGY
                        ],
                        NotificationType.NEGATIVE_ENERGY,
                    );

                successfulNotifications += result.successful;
                failedNotifications += result.failed;
            },
            0,
        );

        this.logger.info(
            `Negative energy notifications completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            { context: PushNotificationsEnergyService.name },
        );
    }

    async retryFailedNotifications(): Promise<void> {
        const notificationTypes = Object.values(NotificationType);

        for (const notificationType of notificationTypes) {
            const { successful, failed } =
                await this.pushNotificationsService.retryFailedNotifications(
                    notificationType,
                );

            if (successful > 0 || failed > 0) {
                this.logger.info(
                    `Retry failed '${notificationType}' notifications completed. Successful: ${successful}, Failed: ${failed}`,
                    { context: PushNotificationsEnergyService.name },
                );
            }
        }
    }
}
