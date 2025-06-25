import { Module } from '@nestjs/common';
import { PushNotificationsService } from './services/push.notifications.service';
import { PushNotificationsSetterService } from './services/push.notifications.setter.service';
import { CommonAppModule } from '../../common.app.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ContextModule } from '../../services/context/context.module';
import { AccountsElasticSearchModule } from 'src/services/elastic-search/accounts.elastic.search.module';
import { PushNotificationsController } from './push.notifications.controller';
import { PushNotificationsEnergyService } from './services/push.notifications.energy.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        AccountsElasticSearchModule,
        DynamicModuleUtils.getCommonRedisModule(),
    ],
    controllers: [
        PushNotificationsController,
    ],
    providers: [
        PushNotificationsService,
        PushNotificationsSetterService,
        PushNotificationsEnergyService,
    ],
    exports: [
        PushNotificationsService,
        PushNotificationsSetterService,
        PushNotificationsEnergyService,
    ],
})
export class PushNotificationsModule {}
