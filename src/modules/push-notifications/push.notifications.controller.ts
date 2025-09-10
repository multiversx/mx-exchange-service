import {
    Body,
    Controller,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
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
import { CustomPushNotificationPayload } from './models/custom.push.notification.payload';

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
    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/push-notifications/send-custom')
    async sendCustomPushNotifications(
        @Body() payload: CustomPushNotificationPayload,
    ): Promise<NotificationResultCount> {
        const { content, notificationKey, targetEpoch, addresses } = payload;

        if (!addresses || addresses.length === 0) {
            return this.pushNotificationsEnergyService.customNotificationForUsersWithEnergy(
                content,
                notificationKey,
                targetEpoch,
            );
        }

        const result = await this.xPortalApiService.sendPushNotifications({
            addresses,
            chainId: pushNotificationsConfig.options.chainId,
            ...content,
        });

        if (result === XPortalPushNotificationsResult.SUCCESS) {
            return { successful: addresses.length, failed: 0 };
        }

        return { successful: 0, failed: addresses.length };
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
}
