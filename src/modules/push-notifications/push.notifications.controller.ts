import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { XPortalApiService } from 'src/services/multiversx-communication/mx.xportal.api.service';
import { pushNotificationsConfig } from 'src/config';
import { NotificationType } from './models/push.notifications.types';

interface PushNotificationPayload {
    addresses: string[];
    type: NotificationType;
}

@Controller()
export class PushNotificationsController {
    constructor(private readonly xPortalApiService: XPortalApiService) {}

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
}
