import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PushNotificationsService } from './services/push.notifications.service';
import { PushNotificationsSetterService } from './services/push.notifications.setter.service';
import { CommonAppModule } from '../../common.app.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ContextModule } from '../../services/context/context.module';
import { CacheModule } from '../../services/caching/cache.module';
import { EnergyModule } from '../energy/energy.module';
import { PushNotificationsEnergyCron } from './crons/push.notifications.energy';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { AccountsElasticSearchModule } from 'src/services/elastic-search/accounts.elastic.search.module';
@Module({
    imports: [
        CommonAppModule,
        ScheduleModule.forRoot(),
        MXCommunicationModule,
        ContextModule,
        CacheModule,
        EnergyModule,
        WeekTimekeepingModule,
        AccountsElasticSearchModule,
    ],
    providers: [
        PushNotificationsService,
        PushNotificationsSetterService,
        PushNotificationsEnergyCron,
    ],
    exports: [],
})
export class PushNotificationsModule {}
