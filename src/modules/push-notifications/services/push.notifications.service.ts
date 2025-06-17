import {
    NotificationConfig,
    NotificationResult,
    NotificationResultCount,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable } from '@nestjs/common';
import { pushNotificationsConfig } from 'src/config';
import { PushNotificationsSetterService } from './push.notifications.setter.service';
import { XPortalApiService } from 'src/services/multiversx-communication/mx.xportal.api.service';
import { delay } from 'src/helpers/helpers';

@Injectable()
export class PushNotificationsService {
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

            await delay(pushNotificationsConfig.options.requestsDelayMs);

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
    ): Promise<NotificationResultCount> {
        const result: NotificationResultCount = {
            successful: 0,
            failed: 0,
        };

        while (true) {
            const failedAddresses =
                await this.notificationsSetter.getFailedNotifications(
                    notificationType,
                    1000,
                );

            if (!failedAddresses || failedAddresses.length === 0) {
                return result;
            }

            const { successful, failed } =
                await this.sendNotificationsInBatches(
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

            result.successful += successful.length;
            result.failed += failed.length;
        }
    }
}
