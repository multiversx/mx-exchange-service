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

@Injectable()
export class PushNotificationsEnergyCron {
    private readonly FEES_COLLECTOR_LAST_EPOCH_KEY = 'push_notifications:fees_collector:last_epoch';
    constructor(
        private readonly pushNotificationsEnergyService: PushNotificationsEnergyService,
        private readonly contextGetter: ContextGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly redisCacheService: RedisCacheService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'feesCollector',
    })
    async feesCollectorRewardsCron() {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        const lastProcessedEpoch: string = await this.redisCacheService.get(this.FEES_COLLECTOR_LAST_EPOCH_KEY);
        if (parseInt(lastProcessedEpoch) === currentEpoch) {
            this.logger.info(
                `Fees collector rewards cron skipped - already processed epoch: ${currentEpoch}`,
                { context: PushNotificationsEnergyCron.name },
            );
            return;
        }

        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(
                String(scAddress.feesCollector),
            );

        if ((currentEpoch - firstWeekStartEpoch) % 7 !== 0) {
            this.logger.info(
                `Fees collector rewards cron skipped for epoch: ${currentEpoch}`,
                { context: PushNotificationsEnergyCron.name },
            );
            return;
        }

        await this.pushNotificationsEnergyService.feesCollectorRewardsNotification(
            currentEpoch,
        );

    }

    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'negativeEnergy',
    })
    async negativeEnergyNotificationsCron() {
        return await this.pushNotificationsEnergyService.negativeEnergyNotifications();
    }

    // @Cron(CronExpression.EVERY_10_MINUTES)
    @LockAndRetry({
        lockKey: 'pushNotifications',
        lockName: 'retryFailed',
    })
    async retryFailedNotificationsCron() {
        await this.pushNotificationsEnergyService.retryFailedNotifications();
    }
}
