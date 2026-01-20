import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    InitStateRequest,
    InitStateResponse,
    UpdateUsdcPriceResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { DEX_STATE_CLIENT } from '../state.module';

@Injectable()
export class StateClient implements OnModuleInit {
    client: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private clientGrpc: ClientGrpc) {}

    onModuleInit() {
        this.client = this.clientGrpc.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    @StateRpcMetrics()
    async initState(request: InitStateRequest): Promise<InitStateResponse> {
        return firstValueFrom(this.client.initState(request));
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
            this.client.getWeeklyTimekeeping({
                address,
                fields: { paths: fields },
            }),
        );

        return result;
    }

    @StateRpcMetrics()
    async updateUsdcPrice(usdcPrice: number): Promise<UpdateUsdcPriceResponse> {
        return firstValueFrom(
            this.client.updateUsdcPrice({
                usdcPrice,
            }),
        );
    }
}
