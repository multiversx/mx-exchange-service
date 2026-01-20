import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { formatFeesCollector } from '../utils/state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class FeesCollectorStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async getFeesCollector(
        fields: (keyof FeesCollectorModel)[] = [],
    ): Promise<FeesCollectorModel> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getFeesCollector({
                fields: { paths: fields },
            }),
        );

        return formatFeesCollector(result, fields);
    }

    async updateFeesCollector(
        feesCollectorUpdates: Partial<FeesCollectorModel>,
    ): Promise<void> {
        const paths = Object.keys(feesCollectorUpdates);

        if (paths.length === 0) {
            return;
        }

        await firstValueFrom(
            this.stateGrpc.client.updateFeesCollector({
                feesCollector: feesCollectorUpdates as FeesCollectorModel,
                updateMask: { paths },
            }),
        );
    }
}
