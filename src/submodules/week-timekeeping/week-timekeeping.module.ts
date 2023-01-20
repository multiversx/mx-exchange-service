import { DynamicModule, Module } from '@nestjs/common';
import { WeekTimekeepingAbiService } from './services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from './services/week-timekeeping.compute.service';
import { WeekTimekeepingGetterService } from './services/week-timekeeping.getter.service';
import { WeekTimekeepingService } from './services/week-timekeeping.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeekTimekeepingResolver } from './week-timekeeping.resolver';

@Module({
    imports: [MXCommunicationModule, CachingModule],
})
export class WeekTimekeepingModule {
    static register(abiProvider: any): DynamicModule {
        return {
            module: WeekTimekeepingModule,
            providers: [
                ApiConfigService,
                WeekTimekeepingService,
                {
                    provide: WeekTimekeepingAbiService,
                    useClass: abiProvider,
                },
                WeekTimekeepingGetterService,
                WeekTimekeepingComputeService,
                WeekTimekeepingResolver,
            ],
            exports: [
                WeekTimekeepingService,
                WeekTimekeepingAbiService,
                WeekTimekeepingGetterService,
                WeekTimekeepingComputeService,
            ],
        };
    }
}
