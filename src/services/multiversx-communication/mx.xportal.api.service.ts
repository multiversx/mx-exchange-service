import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../helpers/api.config.service';
import axios from 'axios';
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
    private readonly axiosInstance;

    constructor(private readonly apiConfigService: ApiConfigService) {
        this.axiosInstance = axios.create({
            baseURL: this.apiConfigService.getNotificationsApiUrl(),
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async sendPushNotifications(
        addresses: string[],
        title: string,
        body: string,
        route?: string,
        iconUrl?: string,
    ): Promise<boolean> {
        const chainId = pushNotificationsConfig.options.chainId;

        const payload: NotificationPayload = {
            addresses,
            chainId,
            title,
            body,
            route,
            iconUrl,
        };

        try {
            const response = await this.axiosInstance.post(
                'notifications-api/api/v1/dapps/push-notifications/send',
                payload,
                {
                    headers: {
                        'x-notifications-api-key':
                            this.apiConfigService.getNotificationsApiKey(),
                    },
                },
            );

            if (response.status === 201) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}
