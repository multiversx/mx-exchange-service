import {
    NotificationConfig,
    NotificationResultCount,
    NotificationType,
} from '../models/push.notifications.types';
import { Injectable } from '@nestjs/common';
import { pushNotificationsConfig } from 'src/config';
import { PushNotificationsSetterService } from './push.notifications.setter.service';
import {
    XPortalApiService,
    XPortalPushNotificationsResult,
} from 'src/services/multiversx-communication/mx.xportal.api.service';
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
    ): Promise<NotificationResultCount> {
        const batchSize = pushNotificationsConfig.options.batchSize;
        const chainId = pushNotificationsConfig.options.chainId;
        const result: NotificationResultCount = {
            successful: 0,
            failed: 0,
        };

        let rateLimitHit = await this.notificationsSetter.isRateLimitHit();

        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);

            try {
                if (rateLimitHit) {
                    throw new Error(
                        `Failed to send ${notificationKey} notifications batch`,
                    );
                }

                const response =
                    await this.xPortalApiService.sendPushNotifications({
                        addresses: batch,
                        chainId,
                        title: notificationParams.title,
                        body: notificationParams.body,
                        route: notificationParams.route,
                        iconUrl: notificationParams.iconUrl,
                    });

                if (response !== XPortalPushNotificationsResult.SUCCESS) {
                    if (response === XPortalPushNotificationsResult.THROTTLED) {
                        await this.notificationsSetter.setRateLimitHit();
                        rateLimitHit = true;
                    }

                    throw new Error(
                        `Failed to send ${notificationKey} notifications batch`,
                    );
                }

                result.successful += batch.length;
            } catch (error) {
                result.failed += batch.length;

                // add to stale failed notifications set - will be picked up on next cron run
                await this.notificationsSetter.addFailedNotifications(
                    batch,
                    notificationKey,
                    'stale',
                );
            } finally {
                await delay(pushNotificationsConfig.options.requestsDelayMs);
            }
        }

        return result;
    }

    async retryFailedNotifications(
        notificationType: NotificationType,
    ): Promise<NotificationResultCount> {
        const result: NotificationResultCount = {
            successful: 0,
            failed: 0,
        };

        await this.copyFailedNotifications(notificationType);

        while (true) {
            const failedAddresses =
                await this.notificationsSetter.getAndDeleteFailedNotifications(
                    notificationType,
                    'active',
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

            result.successful += successful;
            result.failed += failed;
        }
    }

    private async copyFailedNotifications(
        notificationType: NotificationType,
    ): Promise<void> {
        while (true) {
            // get and remove from stale set
            const staleNotifications =
                await this.notificationsSetter.getAndDeleteFailedNotifications(
                    notificationType,
                    'stale',
                    1000,
                );

            if (!staleNotifications || staleNotifications.length === 0) {
                return;
            }

            // add to active set
            await this.notificationsSetter.addFailedNotifications(
                staleNotifications,
                notificationType,
                'active',
            );
        }
    }
}
