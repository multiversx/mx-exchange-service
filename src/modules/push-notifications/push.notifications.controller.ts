import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { XPortalApiService } from 'src/services/multiversx-communication/mx.xportal.api.service';
import { pushNotificationsConfig } from 'src/config';
import {
    NotificationResultCount,
    NotificationType,
} from './models/push.notifications.types';
import { PushNotificationsEnergyService } from './services/push.notifications.energy.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';

interface PushNotificationPayload {
    addresses: string[];
    type: NotificationType;
}

@Controller()
export class PushNotificationsController {
    private readonly FEES_COLLECTOR_LAST_EPOCH_KEY =
        'push_notifications:fees_collector:last_epoch';
    constructor(
        private readonly xPortalApiService: XPortalApiService,
        private readonly pushNotificationsEnergyService: PushNotificationsEnergyService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/push-notifications/send')
    async sendPushNotifications(
        @Body() payload: PushNotificationPayload,
    ): Promise<boolean> {
        const result = await this.xPortalApiService.sendPushNotifications({
            addresses: payload.addresses,
            chainId: pushNotificationsConfig.options.chainId,
            ...pushNotificationsConfig[payload.type],
        });
        return result;
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/push-notifications/fees-collector-rewards')
    async sendFeesCollectorRewardsPushNotifications(
        @Body() payload: { targetEpoch: number },
    ): Promise<NotificationResultCount> {
        const result =
            await this.pushNotificationsEnergyService.feesCollectorRewardsNotification(
                payload.targetEpoch,
            );

        await this.redisCacheService.set(
            this.FEES_COLLECTOR_LAST_EPOCH_KEY,
            payload.targetEpoch,
            Constants.oneWeek(),
        );

        return result;
    }
}
