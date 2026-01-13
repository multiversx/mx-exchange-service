import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { formatStakingFarm } from '../state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class StakingStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

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
