import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PushNotificationsEnergyCron } from './crons/push.notifications.energy';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ContextModule } from '../../services/context/context.module';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { CommonAppModule } from '../../common.app.module';
import { PushNotificationsEnergyService } from './services/push.notifications.energy.service';
import { PushNotificationsService } from './services/push.notifications.service';
import { PushNotificationsSetterService } from './services/push.notifications.setter.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ElasticSearchModule } from '../../services/elastic-search/elastic.search.module';
import { CacheModule } from '../../services/caching/cache.module';
import { EnergyModule } from '../energy/energy.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        ContextModule,
        WeekTimekeepingModule,
        MXCommunicationModule,
        ElasticSearchModule,
        CacheModule,
        EnergyModule,
        DynamicModuleUtils.getRedlockModule(),
        DynamicModuleUtils.getCommonRedisModule(),
    ],
    providers: [
        PushNotificationsEnergyCron,
        PushNotificationsEnergyService,
        PushNotificationsService,
        PushNotificationsSetterService,
    ],
    exports: [],
})
export class PushNotificationsCronModule {}
