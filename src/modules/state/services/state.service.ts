import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import {
    InitStateRequest,
    InitStateResponse,
    UpdateUsdcPriceResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class StateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async initState(request: InitStateRequest): Promise<InitStateResponse> {
        return firstValueFrom(this.stateGrpc.client.initState(request));
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
            this.stateGrpc.client.getWeeklyTimekeeping({
                address,
                fields: { paths: fields },
            }),
        );

        return result;
    }

    @StateRpcMetrics()
    async updateUsdcPrice(usdcPrice: number): Promise<UpdateUsdcPriceResponse> {
        return firstValueFrom(
            this.stateGrpc.client.updateUsdcPrice({
                usdcPrice,
            }),
        );
    }
}
