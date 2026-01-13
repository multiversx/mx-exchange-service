import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { formatFeesCollector } from '../state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

@Injectable()
export class FeesCollectorStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    async getFeesCollector(
        fields: (keyof FeesCollectorModel)[] = [],
    ): Promise<FeesCollectorModel> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getFeesCollector({
                fields: { paths: fields },
            }),
        );

        return formatFeesCollector(result, fields);
    }
}
