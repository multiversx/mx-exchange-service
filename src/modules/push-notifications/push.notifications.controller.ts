import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import {
    XPortalApiService,
    XPortalPushNotificationsResult,
} from 'src/services/multiversx-communication/mx.xportal.api.service';
import { pushNotificationsConfig } from 'src/config';
import {
    NotificationResultCount,
    NotificationType,
} from './models/push.notifications.types';
import { PushNotificationsEnergyService } from './services/push.notifications.energy.service';

interface PushNotificationPayload {
    addresses: string[];
    type: NotificationType;
}

@Controller()
export class PushNotificationsController {
    constructor(
        private readonly xPortalApiService: XPortalApiService,
        private readonly pushNotificationsEnergyService: PushNotificationsEnergyService,
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
        return result === XPortalPushNotificationsResult.SUCCESS;
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/push-notifications/fees-collector-rewards')
    async sendFeesCollectorRewardsPushNotifications(
        @Body() payload: { targetEpoch: number },
    ): Promise<NotificationResultCount> {
        return await this.pushNotificationsEnergyService.feesCollectorRewardsNotification(
            payload.targetEpoch,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/push-notifications/negative-energy')
    async sendNegativeEnergyPushNotifications(
        @Body() payload: { targetEpoch: number },
    ): Promise<NotificationResultCount> {
        return await this.pushNotificationsEnergyService.negativeEnergyNotifications(
            payload.targetEpoch,
        );
    }
}
