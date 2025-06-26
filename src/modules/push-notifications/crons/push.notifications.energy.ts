import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { PushNotificationsEnergyService } from '../services/push.notifications.energy.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { Logger } from 'winston';
import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { NotificationResultCount } from '../models/push.notifications.types';

@Injectable()
export class PushNotificationsEnergyCron {
    private readonly FEES_COLLECTOR_LAST_EPOCH_KEY =
        'push_notifications:fees_collector:last_epoch';
    private readonly NEGATIVE_ENERGY_LAST_EPOCH_KEY =
        'push_notifications:negative_energy:last_epoch';
    constructor(
        private readonly pushNotificationsEnergyService: PushNotificationsEnergyService,
        private readonly contextGetter: ContextGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly redisCacheService: RedisCacheService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async executeNotificationCron(
        cacheKey: string,
        cronName: string,
        expectedModulo: number,
        notificationAction: (
            currentEpoch: number,
        ) => Promise<NotificationResultCount>,
    ): Promise<void> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        const lastProcessedEpoch: string = await this.redisCacheService.get(
            cacheKey,
        );
        if (parseInt(lastProcessedEpoch) === currentEpoch) {
            this.logger.info(
                `${cronName} cron skipped - already processed epoch: ${currentEpoch}`,
                { context: PushNotificationsEnergyCron.name },
            );
            return;
        }

        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(
                String(scAddress.feesCollector),
            );

        if ((currentEpoch - firstWeekStartEpoch) % 7 !== expectedModulo) {
            this.logger.info(
                `${cronName} cron skipped for epoch: ${currentEpoch}`,
                { context: PushNotificationsEnergyCron.name },
            );
            return;
        }

        await notificationAction(currentEpoch);

        await this.redisCacheService.set(cacheKey, String(currentEpoch));
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'feesCollector',
    })
    async feesCollectorRewardsCron() {
        await this.executeNotificationCron(
            this.FEES_COLLECTOR_LAST_EPOCH_KEY,
            'Fees collector rewards',
            0,
            (currentEpoch) =>
                this.pushNotificationsEnergyService.feesCollectorRewardsNotification(
                    currentEpoch,
                ),
        );
    }

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'negativeEnergy',
    })
    async negativeEnergyNotificationsCron() {
        await this.executeNotificationCron(
            this.NEGATIVE_ENERGY_LAST_EPOCH_KEY,
            'Negative energy notifications',
            3,
            (currentEpoch) =>
                this.pushNotificationsEnergyService.negativeEnergyNotifications(
                    currentEpoch,
                ),
        );
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'retryFailed',
    })
    async retryFailedNotificationsCron() {
        await this.pushNotificationsEnergyService.retryFailedNotifications();
    }
}
