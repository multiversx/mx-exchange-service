import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";


@Injectable()
export abstract class WeekTimekeepingComputerService {
    firstWeekStartEpoch: number;
    epochsInWeek: number;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        this.firstWeekStartEpoch = 100;
        this.epochsInWeek = 7;
    }

    async computeWeekForEpoch(_scAddress: string, epoch: number): Promise<number> {
        if (epoch < this.firstWeekStartEpoch) {
            return -1;
        }

        return (epoch - this.firstWeekStartEpoch) / this.epochsInWeek + 1;
    }

    async computeStartEpochForWeek(_scAddress: string, week: number): Promise<number> {
        if (week == 0) {
            return -1;
        }

        return this.firstWeekStartEpoch + (week - 1) * this.epochsInWeek
    }

    async computeEndEpochForWeek(_scAddress: string, week: number): Promise<number> {
        if (week == 0) {
            return -1;
        }

        const startEpochForWeek = await this.computeStartEpochForWeek(_scAddress, week)
        return startEpochForWeek + this.epochsInWeek - 1;
    }

}
