import {
    NotificationConfig,
    NotificationResult,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable } from '@nestjs/common';
import { pushNotificationsConfig } from 'src/config';
import { PushNotificationsSetterService } from './push.notifications.setter.service';
import { XPortalApiService } from 'src/services/multiversx-communication/mx.xportal.api.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class PushNotificationsService {
    private readonly logger = new Logger(PushNotificationsService.name);

    constructor(
        private readonly xPortalApiService: XPortalApiService,
        private readonly notificationsSetter: PushNotificationsSetterService,
    ) {}

    async sendNotificationsInBatches(
        addresses: string[],
        notificationParams: NotificationConfig,
        notificationKey: string,
    ): Promise<NotificationResult> {
        const batchSize = pushNotificationsConfig.options.batchSize;
        const chainId = pushNotificationsConfig.options.chainId;
        const failed: string[] = [];
        const successful: string[] = [];

        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            const success = await this.xPortalApiService.sendPushNotifications({
                addresses: batch,
                chainId,
                title: notificationParams.title,
                body: notificationParams.body,
                route: notificationParams.route,
                iconUrl: notificationParams.iconUrl,
            });

            if (success) {
                successful.push(...batch);
            } else {
                failed.push(...batch);
            }
        }

        if (failed.length > 0) {
            await this.notificationsSetter.addFailedNotifications(
                failed,
                notificationKey,
            );
        }

        return { successful, failed };
    }

    async retryFailedNotifications(
        notificationType: NotificationType,
    ): Promise<void> {
        const failedAddresses =
            await this.notificationsSetter.getFailedNotifications(
                notificationType,
            );

        if (!failedAddresses || failedAddresses.length === 0) {
            return;
        }

        const { successful } = await this.sendNotificationsInBatches(
            failedAddresses,
            pushNotificationsConfig[notificationType],
            notificationType,
        );

        if (successful.length > 0) {
            await this.notificationsSetter.removeFailedNotifications(
                successful,
                notificationType,
            );
        }
    }
}
