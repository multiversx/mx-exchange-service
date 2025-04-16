import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../helpers/api.config.service';
import { ApiService } from '@multiversx/sdk-nestjs-http';

type NotificationPayload = {
    addresses: string[];
    chainId: number;
    title: string;
    body: string;
    route?: string;
    iconUrl?: string;
};

@Injectable()
export class XPortalApiService {
    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly apiService: ApiService,
    ) {}

    async sendPushNotifications(
        notificationPayload: NotificationPayload,
    ): Promise<boolean> {
        const baseUrl = this.apiConfigService.getNotificationsApiUrl();
        const apiKey = this.apiConfigService.getNotificationsApiKey();
        const url = `${baseUrl}/notifications-api/api/v1/dapps/push-notifications/send`;

        try {
            const response = await this.apiService.post(
                url,
                notificationPayload,
                {
                    headers: {
                        'x-notifications-api-key': apiKey,
                    },
                },
            );

            return response.status === 201;
        } catch (error) {
            return false;
        }
    }
}
