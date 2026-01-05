import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { formatFeesCollector } from '../dex.state.utils';

@Injectable()
export class FeesCollectorStateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async getFeesCollector(
        fields: (keyof FeesCollectorModel)[] = [],
    ): Promise<FeesCollectorModel> {
        const result = await firstValueFrom(
            this.dexStateServive.getFeesCollector({
                fields: { paths: fields },
            }),
        );

        return formatFeesCollector(result, fields);
    }
}
