import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { formatFarm } from '../state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class FarmsStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async getFarms(
        addresses: string[] = [],
        fields: (keyof FarmModel)[] = [],
    ): Promise<FarmModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getFarms({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }

    @StateRpcMetrics()
    async getAllFarms(fields: (keyof FarmModel)[] = []): Promise<FarmModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllFarms({
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }
}
