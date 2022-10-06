import { Module } from '@nestjs/common';
import { WeekTimekeepingAbiService } from "./services/week-timekeeping.abi.service";
import { WeekTimekeepingComputerService } from "./services/week-timekeeping.computer.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";


@Module({
    imports: [
        // TODO: add imports
    ],
    exports: [
        WeekTimekeepingAbiService,
        WeekTimekeepingGetterService,
        WeekTimekeepingComputerService,
    ],
})
export class WeeklyTimekeepingModule {}
