import { Injectable } from '@nestjs/common';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { GetWeeklyTimekeepingRequest } from '../../interfaces/dex_state.interfaces';
import { StateStore } from '../state.store';

@Injectable()
export class TimekeepingStateHandler {
    constructor(private readonly stateStore: StateStore) {}

    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ): WeekTimekeepingModel {
        const fields = request.fields?.paths ?? [];
        const { address } = request;

        if (!address) {
            throw new Error(`SC Address missing`);
        }

        let time: WeekTimekeepingModel;

        if (this.stateStore.farms.has(address)) {
            time = { ...this.stateStore.farms.get(address).time };
        }

        if (this.stateStore.stakingFarms.has(address)) {
            time = { ...this.stateStore.stakingFarms.get(address).time };
        }

        const feesCollector = this.stateStore.feesCollector;
        if (feesCollector && feesCollector.address === address) {
            time = { ...feesCollector.time };
        }

        if (time === undefined) {
            throw new Error(`Could not find time for SC ${address}`);
        }

        if (fields.length === 0) {
            return time;
        }

        const partialTime: Partial<WeekTimekeepingModel> = {};
        for (const field of fields) {
            partialTime[field] = time[field];
        }

        return partialTime as WeekTimekeepingModel;
    }
}
