import {
    AccountType,
    NotificationType,
} from '../models/push.notifications.types';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationsService } from '../services/push.notifications.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticAccountsEnergyService } from 'src/services/elastic-search/services/es.accounts.energy.service';
import { pushNotificationsConfig, scAddress } from 'src/config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PushNotificationsEnergyCron {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly pushNotificationsService: PushNotificationsService,
        private readonly accountsEnergyElasticService: ElasticAccountsEnergyService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(
        process.env.NODE_ENV === 'mainnet'
            ? CronExpression.EVERY_DAY_AT_NOON
            : CronExpression.EVERY_4_HOURS,
    )
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
            this.logger.info(
                `Fees collector rewards cron skipped for epoch: ${currentEpoch - 1}`,
                { context: PushNotificationsEnergyCron.name },
            );
            return;
        }

        this.logger.info(
            `Fees collector rewards cron started for epoch: ${ currentEpoch - 1}`,
            { context: PushNotificationsEnergyCron.name },
        );

        let successfulNotifications = 0;
        let failedNotifications = 0;

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

        this.logger.info(
            `Fees collector rewards cron completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            { context: PushNotificationsEnergyCron.name },
        );
    }

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

        this.logger.info(
            `Negative energy notifications cron completed. Successful: ${successfulNotifications}, Failed: ${failedNotifications}`,
            { context: PushNotificationsEnergyCron.name },
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
