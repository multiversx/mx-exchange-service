import { Injectable } from '@nestjs/common';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { UpdateFeesCollectorRequest } from '../../interfaces/dex_state.interfaces';
import { FeesCollectorComputeService } from '../compute/fees-collector.compute.service';
import { StateStore } from '../state.store';

@Injectable()
export class FeesCollectorStateHandler {
    constructor(
        private readonly stateStore: StateStore,
        private readonly feesCollectorComputeService: FeesCollectorComputeService,
    ) {}

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

    updateFeesCollector(request: UpdateFeesCollectorRequest): void {
        const { feesCollector: partialFeesCollector, updateMask } = request;

        const feesCollector = this.stateStore.feesCollector;

        const updatedFeesCollector = { ...feesCollector };

        for (const field of updateMask.paths) {
            if (partialFeesCollector[field] === undefined) {
                continue;
            }

            if (field === 'address') {
                continue;
            }

            updatedFeesCollector[field] = partialFeesCollector[field];
        }

        const completeFeesCollector =
            this.feesCollectorComputeService.computeMissingFeesCollectorFields(
                updatedFeesCollector,
                this.stateStore.tokens,
            );

        this.stateStore.setFeesCollector({ ...completeFeesCollector });
    }
}
