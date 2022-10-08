import { Module } from '@nestjs/common';
import { WeekTimekeepingAbiService } from "./services/week-timekeeping.abi.service";
import { WeekTimekeepingComputeService } from "./services/week-timekeeping.compute.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";
import { WeekTimekeepingService } from "./services/week-timekeeping.service";
import { ElrondCommunicationModule } from "../../services/elrond-communication/elrond-communication.module";
import { CachingModule } from "../../services/caching/cache.module";
import { ApiConfigService } from "../../helpers/api.config.service";


@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule
    ],
    providers: [
        ApiConfigService,
        WeekTimekeepingService,
        WeekTimekeepingAbiService,
        WeekTimekeepingGetterService,
        WeekTimekeepingComputeService
    ],
    exports: [
        WeekTimekeepingService,
        WeekTimekeepingAbiService,
        WeekTimekeepingGetterService,
        WeekTimekeepingComputeService,
    ],
})
export class WeekTimekeepingModule {}

