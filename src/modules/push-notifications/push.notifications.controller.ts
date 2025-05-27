import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import {
    NotificationPayload,
    XPortalApiService,
} from 'src/services/multiversx-communication/mx.xportal.api.service';

@Controller()
export class PushNotificationsController {
    constructor(private readonly xPortalApiService: XPortalApiService) {}

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/push-notifications/send')
    async sendPushNotifications(
        @Body() notificationPayload: NotificationPayload,
    ): Promise<boolean> {
        const result = await this.xPortalApiService.sendPushNotifications(
            notificationPayload,
        );
        return result;
    }
}
