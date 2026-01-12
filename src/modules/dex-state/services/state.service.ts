import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    InitStateResponse,
    UpdateUsdcPriceResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';

@Injectable()
export class StateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async initState(
        tokens: EsdtToken[],
        pairs: PairModel[],
        farms: FarmModel[],
        stakingFarms: StakingModel[],
        stakingProxies: StakingProxyModel[],
        feesCollector: FeesCollectorModel,
        commonTokenIDs: string[],
        usdcPrice: number,
    ): Promise<InitStateResponse> {
        return firstValueFrom(
            this.dexStateServive.initState({
                tokens: [...tokens],
                pairs: [...pairs],
                farms: [...farms],
                stakingFarms: [...stakingFarms],
                stakingProxies: [...stakingProxies],
                feesCollector,
                commonTokenIDs,
                usdcPrice,
            }),
        );
    }

    @StateRpcMetrics()
    async getWeeklyTimekeeping(
        address: string,
        fields: (keyof WeekTimekeepingModel)[] = [],
    ): Promise<WeekTimekeepingModel> {
        if (!address) {
            return undefined;
        }

        const result = await firstValueFrom(
            this.dexStateServive.getWeeklyTimekeeping({
                address,
                fields: { paths: fields },
            }),
        );

        return result;
    }

    @StateRpcMetrics()
    async updateUsdcPrice(usdcPrice: number): Promise<UpdateUsdcPriceResponse> {
        return firstValueFrom(
            this.dexStateServive.updateUsdcPrice({
                usdcPrice,
            }),
        );
    }
}
