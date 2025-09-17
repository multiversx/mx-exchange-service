import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNotEmptyObject,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { pushNotificationsConfig } from 'src/config';
import { NotificationConfig } from './push.notifications.types';

export class NotificationContent implements NotificationConfig {
    @IsString()
    title: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsString()
    route: string;

    @IsString()
    iconUrl =
        'https://xexchange.com/assets/imgs/mx-logos/xexchange-logo@2x.webp';
}

export class CustomPushNotificationPayload {
    @IsNotEmptyObject()
    @ValidateNested()
    content: NotificationContent;

    @IsString()
    notificationKey: string;

    @ValidateIf((o) => !o.addresses || o.addresses.length === 0)
    @IsInt()
    @Min(1)
    targetEpoch?: number;

    @ValidateIf((o) => !o.targetEpoch)
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    @ArrayMaxSize(pushNotificationsConfig.options.batchSize)
    addresses?: string[];
}
