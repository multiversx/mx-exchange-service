import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { formatFarm } from '../dex.state.utils';

@Injectable()
export class FarmsStateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async getFarms(
        addresses: string[] = [],
        fields: (keyof FarmModel)[] = [],
    ): Promise<FarmModel[]> {
        const result = await firstValueFrom(
            this.dexStateServive.getFarms({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }

    @StateRpcMetrics()
    async getAllFarms(fields: (keyof FarmModel)[] = []): Promise<FarmModel[]> {
        const result = await firstValueFrom(
            this.dexStateServive.getAllFarms({
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }
}
