import { forwardRef, Module } from '@nestjs/common';
import { WeekTimekeepingAbiService } from './services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from './services/week-timekeeping.compute.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeekTimekeepingResolver } from './week-timekeeping.resolver';
import { FarmModuleV2 } from 'src/modules/farm/v2/farm.v2.module';
import { FeesCollectorModule } from 'src/modules/fees-collector/fees-collector.module';
import { ContextModule } from 'src/services/context/context.module';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { WeekTimekeepingSetterService } from './services/week-timekeeping.setter.service';

@Module({
    imports: [
        MXCommunicationModule,
        ContextModule,
        forwardRef(() => FarmModuleV2),
        forwardRef(() => FeesCollectorModule),
        RemoteConfigModule,
    ],
    providers: [
        ApiConfigService,
        WeekTimekeepingAbiService,
        WeekTimekeepingComputeService,
        WeekTimekeepingResolver,
        WeekTimekeepingSetterService,
    ],
    exports: [
        WeekTimekeepingAbiService,
        WeekTimekeepingComputeService,
        WeekTimekeepingSetterService,
    ],
})
export class WeekTimekeepingModule {}
