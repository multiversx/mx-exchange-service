import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { UpdateFarmsResponse } from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { formatFarm } from '../utils/state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class FarmsStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async getFarms(
        addresses: string[] = [],
        fields: (keyof FarmModelV2)[] = [],
    ): Promise<FarmModelV2[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getFarms({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }

    @StateRpcMetrics()
    async getAllFarms(
        fields: (keyof FarmModelV2)[] = [],
    ): Promise<FarmModelV2[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllFarms({
                fields: { paths: fields },
            }),
        );

        return result.farms?.map((farm) => formatFarm(farm, fields)) ?? [];
    }

    @StateRpcMetrics()
    async updateFarms(
        farmUpdates: Map<string, Partial<FarmModelV2>>,
    ): Promise<UpdateFarmsResponse> {
        if (farmUpdates.size === 0) {
            return {
                failedAddresses: [],
                updatedCount: 0,
            };
        }

        const farms: FarmModelV2[] = [];
        const paths: string[] = [];

        farmUpdates.forEach((farm, address) => {
            paths.push(...Object.keys(farm));

            farms.push({
                address,
                ...(farm as FarmModelV2),
            });
        });

        return firstValueFrom(
            this.stateGrpc.client.updateFarms({
                farms,
                updateMask: { paths: [...new Set(paths)] },
            }),
        );
    }
}
