import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    UpdateStakingFarmsResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { DEX_STATE_CLIENT } from '../../state.module';
import { formatStakingFarm } from '../../utils/state.format.utils';

@Injectable()
export class StakingStateClient implements OnModuleInit {
    client: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private clientGrpc: ClientGrpc) {}

    onModuleInit() {
        this.client = this.clientGrpc.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async getStakingFarms(
        addresses: string[] = [],
        fields: (keyof StakingModel)[] = [],
    ): Promise<StakingModel[]> {
        const result = await firstValueFrom(
            this.client.getStakingFarms({
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
            this.client.getAllStakingFarms({
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
            this.client.updateStakingFarms({
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
            this.client.getStakingProxies({
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
            this.client.getAllStakingProxies({
                fields: { paths: fields },
            }),
        );

        return result.stakingProxies ?? [];
    }
}
