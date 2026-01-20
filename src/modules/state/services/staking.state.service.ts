import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { UpdateStakingFarmsResponse } from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { formatStakingFarm } from '../utils/state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class StakingStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async getStakingFarms(
        addresses: string[] = [],
        fields: (keyof StakingModel)[] = [],
    ): Promise<StakingModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getStakingFarms({
                addresses,
                fields: { paths: fields },
            }),
        );

        return (
            result.stakingFarms?.map((stakingFarm) =>
                formatStakingFarm(stakingFarm, fields),
            ) ?? []
        );
    }

    @StateRpcMetrics()
    async getAllStakingFarms(
        fields: (keyof StakingModel)[] = [],
    ): Promise<StakingModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllStakingFarms({
                fields: { paths: fields },
            }),
        );

        return (
            result.stakingFarms?.map((stakingFarm) =>
                formatStakingFarm(stakingFarm, fields),
            ) ?? []
        );
    }

    @StateRpcMetrics()
    async updateStakingFarms(
        stakingFarmUpdates: Map<string, Partial<StakingModel>>,
    ): Promise<UpdateStakingFarmsResponse> {
        if (stakingFarmUpdates.size === 0) {
            return {
                failedAddresses: [],
                updatedCount: 0,
            };
        }

        const stakingFarms: StakingModel[] = [];
        const paths: string[] = [];

        stakingFarmUpdates.forEach((stakingFarm, address) => {
            paths.push(...Object.keys(stakingFarm));

            stakingFarms.push({
                address,
                ...(stakingFarm as StakingModel),
            });
        });

        return firstValueFrom(
            this.stateGrpc.client.updateStakingFarms({
                stakingFarms,
                updateMask: { paths: [...new Set(paths)] },
            }),
        );
    }

    @StateRpcMetrics()
    async getStakingProxies(
        addresses: string[] = [],
        fields: (keyof StakingProxyModel)[] = [],
    ): Promise<StakingProxyModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getStakingProxies({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.stakingProxies ?? [];
    }

    @StateRpcMetrics()
    async getAllStakingProxies(
        fields: (keyof StakingProxyModel)[] = [],
    ): Promise<StakingProxyModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllStakingProxies({
                fields: { paths: fields },
            }),
        );

        return result.stakingProxies ?? [];
    }
}
