import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { scAddress } from 'src/config';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import {
    AddressUtils,
    BinaryUtils,
    ErrorLoggerAsync,
    Lock,
    Constants,
} from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import {
    ElasticQuery,
    ElasticService,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import axios from 'axios';
import {
    AccountType,
    ContractKeysRaw,
    NotificationPayload,
    UserEnergyAddress,
} from './models/push.notifications.model';
import { PushNotificationsSetterService } from './services/push.notifications.setter.service';

@Injectable()
export class PushNotificationsService {
    private readonly logger = new Logger(PushNotificationsService.name);
    private readonly maxRetries: number;

    constructor(
        private readonly apiService: MXApiService,
        private readonly apiConfigService: ApiConfigService,
        private readonly elasticService: ElasticService,
        private readonly contextGetter: ContextGetterService,
        private readonly notificationsSetter: PushNotificationsSetterService,
    ) {
        this.maxRetries = this.apiConfigService.getNotificationsMaxRetries();
    }

    @ErrorLoggerAsync()
    private async usersWithEnergyFromContractStorage(): Promise<
        UserEnergyAddress[]
    > {
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

        return userEnergyAddresses.map((address) => ({
            address,
            notificationSent: false,
        }));
    }

    @ErrorLoggerAsync()
    private async getUsersFromIndexer(
        epoch: number,
    ): Promise<UserEnergyAddress[]> {
        const query = ElasticQuery.create()
            .withPagination({ from: 0, size: 10000 })
            .withMustExistCondition('energyDetails');

        query.condition.must = [
            QueryType.Range('energyDetails.amount', { key: 'gt', value: 0 }),
        ];

        const allAddresses: string[] = [];

        await this.elasticService.getScrollableList(
            `accounts-000001_${epoch}`,
            'address',
            query,
            async (items: AccountType[]) => {
                const addresses = items.map(
                    (item: AccountType) => item.address,
                );
                allAddresses.push(...addresses);
            },
        );

        return allAddresses.map((address) => ({
            address,
            notificationSent: false,
        }));
    }

    private async sendBatchNotifications(
        addresses: string[],
    ): Promise<boolean> {
        const chainId = Number(this.apiConfigService.getChainId());
        const notificationsApiUrl =
            this.apiConfigService.getNotificationsApiUrl();
        const notificationsApiKey =
            this.apiConfigService.getNotificationsApiKey();

        const payload: NotificationPayload = {
            addresses,
            chainId,
            title: 'Energy Update',
            body: 'You can now claim your rewards',
            route: '/portfolio',
            iconUrl:
                'https://xexchange.com/assets/imgs/mx-logos/xexchange-logo@2x.webp',
        };

        const response = await axios.post(notificationsApiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-notifications-api-key': notificationsApiKey,
            },
        });

        if (response.status !== 201) {
            return false;
        }

        return true;
    }

    private async processNotificationBatch(
        addresses: string[],
        maxRetries: number,
    ): Promise<{ successful: string[]; failed: string[] }> {
        const batchSize =
            await this.apiConfigService.getNotificationsBatchSize();

        const successful: string[] = [];
        let remainingAddresses = [...addresses];

        for (
            let retryCount = 0;
            retryCount < maxRetries && remainingAddresses.length > 0;
            retryCount++
        ) {
            if (retryCount > 0) {
                this.logger.log(
                    `Retry attempt ${retryCount} for ${remainingAddresses.length} addresses`,
                );
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }

            const addressesToRetry = [...remainingAddresses];
            remainingAddresses = [];

            for (let i = 0; i < addressesToRetry.length; i += batchSize) {
                const batch = addressesToRetry.slice(i, i + batchSize);
                const success = await this.sendBatchNotifications(batch);

                if (success) {
                    successful.push(...batch);
                } else {
                    remainingAddresses.push(...batch);
                }
            }
        }

        return { successful, failed: remainingAddresses };
    }

    @GetOrSetCache({
        baseKey: 'notifications',
        remoteTtl: Constants.oneWeek(),
        localTtl: Constants.oneDay() * 6,
    })
    private async userEnergyAddresses(): Promise<UserEnergyAddress[]> {
        const isDevnet = process.env.NODE_ENV === 'devnet';

        if (isDevnet) return await this.usersWithEnergyFromContractStorage();

        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        return await this.getUsersFromIndexer(currentEpoch - 1);
    }

    @Cron('0 0 19 * * 5') // Every Friday at 19:00
    @Lock({ name: 'handleNotificationsCron', verbose: true })
    async handleNotificationsCron() {
        if (!this.apiConfigService.isNotificationsModuleActive()) {
            return;
        }

        try {
            this.logger.log('Starting weekly energy notifications job...');

            // Get eligible users (will use cache if available)
            const eligibleUsers = await this.userEnergyAddresses();

            // Process notifications
            const usersToNotify = eligibleUsers
                .filter((user) => !user.notificationSent)
                .map((user) => user.address);

            if (usersToNotify.length === 0) {
                this.logger.log('No new notifications to send');
                return;
            }

            const { successful, failed } = await this.processNotificationBatch(
                usersToNotify,
                this.maxRetries,
            );

            // Update notification status for successful ones
            if (successful.length > 0) {
                await this.notificationsSetter.updateNotificationStatus(
                    successful,
                    true,
                );
                this.logger.log(
                    `Successfully sent notifications to ${successful.length} addresses`,
                );
            }

            this.logger.log(
                `Weekly notification job completed. Success: ${successful.length}, Failed: ${failed.length}`,
            );
        } catch (error) {
            this.logger.error('Error in notification cron job:', error.message);
            throw error;
        }
    }
}
