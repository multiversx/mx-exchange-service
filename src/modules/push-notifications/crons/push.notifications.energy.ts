import {
    AccountType,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationsService } from '../services/push.notifications.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { pushNotificationsConfig, scAddress } from 'src/config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';

@Injectable()
export class PushNotificationsEnergyCron {
    constructor(
        private readonly energyAbiService: EnergyAbiService,
        private readonly contextGetter: ContextGetterService,
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'feesCollector',
    })
    async feesCollectorRewardsCron() {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(
                String(scAddress.feesCollector),
            );

        if ((currentEpoch - firstWeekStartEpoch) % 7 !== 0) {
            return;
        }

        let successfulNotifications = 0;
        let failedNotifications = 0;

        const isDevnet = process.env.NODE_ENV === 'devnet';

        if (isDevnet) {
            const addresses = await this.energyAbiService.getUsersWithEnergy();

            const result =
                await this.pushNotificationsService.sendNotificationsInBatches(
                    addresses,
                    pushNotificationsConfig[
                        NotificationType.FEES_COLLECTOR_REWARDS
                    ],
                    NotificationType.FEES_COLLECTOR_REWARDS,
                );

            successfulNotifications += result.successful.length;
            failedNotifications += result.failed.length;
            return;
        }

        await this.accountsEnergyElasticService.getAccountsByEnergyAmount(
            currentEpoch - 1,
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

                successfulNotifications += result.successful.length;
                failedNotifications += result.failed.length;
            },
        );

        this.logger.log(
            `Fees collector rewards cron completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            'PushNotificationsEnergyCron',
        );
    }

    @Cron('0 12 */2 * *') // Every 2 days at noon
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'negativeEnergy',
    })
    async negativeEnergyNotificationsCron() {
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

                successfulNotifications += result.successful.length;
                failedNotifications += result.failed.length;
            },
            0,
        );

        this.logger.log(
            `Negative energy notifications cron completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            'PushNotificationsEnergyCron',
        );
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'retryFailed',
    })
    async retryFailedNotificationsCron() {
        const notificationTypes = Object.values(NotificationType);

        for (const notificationType of notificationTypes) {
            await this.pushNotificationsService.retryFailedNotifications(
                notificationType,
            );
        }
    }
}
