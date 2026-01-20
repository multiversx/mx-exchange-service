import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { DEX_STATE_CLIENT } from '../../state.module';
import { formatFeesCollector } from '../../utils/state.format.utils';

@Injectable()
export class FeesCollectorStateClient implements OnModuleInit {
    client: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private clientGrpc: ClientGrpc) {}

    onModuleInit() {
        this.client = this.clientGrpc.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async getFeesCollector(
        fields: (keyof FeesCollectorModel)[] = [],
    ): Promise<FeesCollectorModel> {
        const result = await firstValueFrom(
            this.client.getFeesCollector({
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
            this.client.updateFeesCollector({
                feesCollector: feesCollectorUpdates as FeesCollectorModel,
                updateMask: { paths },
            }),
        );
    }
}
