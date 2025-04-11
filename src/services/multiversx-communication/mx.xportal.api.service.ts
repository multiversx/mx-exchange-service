import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../helpers/api.config.service';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { pushNotificationsConfig } from 'src/config';

interface NotificationPayload {
    addresses: string[];
    chainId: number;
    title: string;
    body: string;
    route?: string;
    iconUrl?: string;
}

@Injectable()
export class XPortalApiService {
    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly apiService: ApiService,
    ) {}

    async sendPushNotifications(
        addresses: string[],
        title: string,
        body: string,
        route?: string,
        iconUrl?: string,
    ): Promise<boolean> {
        const chainId = pushNotificationsConfig.options.chainId;
        const baseUrl = this.apiConfigService.getNotificationsApiUrl();
        const apiKey = this.apiConfigService.getNotificationsApiKey();
        const url = `${baseUrl}/notifications-api/api/v1/dapps/push-notifications/send`;

        const payload: NotificationPayload = {
            addresses,
            chainId,
            title,
            body,
            route,
            iconUrl,
        };

        console.log(payload);
        try {
            const response = await this.apiService.post(url, payload, {
                headers: {
                    'x-notifications-api-key': apiKey,
                },
            });

            return response.status === 201;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
