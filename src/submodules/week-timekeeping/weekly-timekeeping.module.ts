import { Module } from '@nestjs/common';
import { WeekTimekeepingAbiService } from "./services/week-timekeeping.abi.service";
import { WeekTimekeepingComputeService } from "./services/week-timekeeping.compute.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";


@Module({
    imports: [
        // TODO: add imports
    ],
    exports: [
        WeekTimekeepingAbiService,
        WeekTimekeepingGetterService,
        WeekTimekeepingComputeService,
    ],
})
export class WeeklyTimekeepingModule {}
