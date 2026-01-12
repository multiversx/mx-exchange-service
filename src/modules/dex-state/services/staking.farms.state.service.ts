import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { formatStakingFarm } from '../dex.state.utils';

@Injectable()
export class StakingFarmsStateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async getStakingFarms(
        addresses: string[] = [],
        fields: (keyof StakingModel)[] = [],
    ): Promise<StakingModel[]> {
        const result = await firstValueFrom(
            this.dexStateServive.getStakingFarms({
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
            this.dexStateServive.getAllStakingFarms({
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
    async getStakingProxies(
        addresses: string[] = [],
        fields: (keyof StakingProxyModel)[] = [],
    ): Promise<StakingProxyModel[]> {
        const result = await firstValueFrom(
            this.dexStateServive.getStakingProxies({
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
            this.dexStateServive.getAllStakingProxies({
                fields: { paths: fields },
            }),
        );

        return result.stakingProxies ?? [];
    }
}
