import { Injectable } from '@nestjs/common';
import { pushNotificationsConfig, scAddress } from 'src/config';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import {
    AddressUtils,
    BinaryUtils,
    ErrorLoggerAsync,
} from '@multiversx/sdk-nestjs-common';

import {
    ContractKeysRaw,
    NotificationConfig,
    NotificationResult,
    NotificationType,
} from '../models/push.notifications.types';
import { PushNotificationsSetterService } from './push.notifications.setter.service';
import { XPortalApiService } from 'src/services/multiversx-communication/mx.xportal.api.service';

@Injectable()
export class PushNotificationsService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly apiConfigService: ApiConfigService,
        private readonly notificationsSetter: PushNotificationsSetterService,
        private readonly xPortalApiService: XPortalApiService,
    ) {}

    @ErrorLoggerAsync()
    async usersWithEnergyFromContractStorage(): Promise<string[]> {
        const contractAddress = scAddress.simpleLockEnergy;
        const contractKeysRaw: ContractKeysRaw =
            await this.apiService.doGetGeneric(
                'getContractKeys',
                `address/${contractAddress}/keys`,
            );

        const contractPairs = Object.entries(
            contractKeysRaw?.data?.pairs || {},
        );

        const userEnergyKey = BinaryUtils.stringToHex('userEnergy');
        const userEnergyKeys = contractPairs
            .filter(([key, _]) => key.startsWith(userEnergyKey))
            .map(([key, _]) => key.replace(userEnergyKey, ''));

        const userEnergyAddresses = userEnergyKeys.map((key) =>
            AddressUtils.bech32Encode(key),
        );

        return userEnergyAddresses;
    }

    async sendNotifications(
        addresses: string[],
        notificationType: NotificationType,
    ): Promise<NotificationResult> {
        return this.sendNotificationsInBatches(
            addresses,
            pushNotificationsConfig[notificationType],
            notificationType,
        );
    }

    private async sendNotificationsInBatches(
        addresses: string[],
        notificationParams: NotificationConfig,
        notificationKey: string,
    ): Promise<NotificationResult> {
        const batchSize = pushNotificationsConfig.options.batchSize;
        const failed: string[] = [];
        const successful: string[] = [];

        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            try {
                const success =
                    await this.xPortalApiService.sendPushNotifications(
                        batch,
                        notificationParams.title,
                        notificationParams.body,
                        notificationParams.route,
                        notificationParams.iconUrl,
                    );

                if (success) {
                    successful.push(...batch);
                } else {
                    failed.push(...batch);
                }
            } catch (error) {
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

        const { successful } = await this.sendNotifications(
            failedAddresses,
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
