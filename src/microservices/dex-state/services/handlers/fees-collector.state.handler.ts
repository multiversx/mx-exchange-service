import { Injectable } from '@nestjs/common';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { StateStore } from '../state.store';

@Injectable()
export class FeesCollectorStateHandler {
    constructor(private readonly stateStore: StateStore) {}

    getFeesCollector(fields: string[] = []): FeesCollectorModel {
        const feesCollector = this.stateStore.feesCollector;

        if (!feesCollector) {
            throw new Error('Fees collector not initialized');
        }

        if (fields.length === 0) {
            return { ...feesCollector };
        }

        const result: Partial<FeesCollectorModel> = {};
        for (const field of fields) {
            result[field] = feesCollector[field];
        }

        return result as FeesCollectorModel;
    }
}
