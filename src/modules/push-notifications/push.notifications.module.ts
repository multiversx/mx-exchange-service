import { Module } from '@nestjs/common';
import { PushNotificationsService } from './services/push.notifications.service';
import { PushNotificationsSetterService } from './services/push.notifications.setter.service';
import { CommonAppModule } from '../../common.app.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ElasticSearchModule } from '../../services/elastic-search/elastic.search.module';
import { ContextModule } from '../../services/context/context.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { PushNotificationsEnergyService } from './services/push.notifications.energy.service';
import { PushNotificationsController } from './push.notifications.controller';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ElasticSearchModule,
        ContextModule,
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
