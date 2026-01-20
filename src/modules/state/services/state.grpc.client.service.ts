import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { DEX_STATE_CLIENT } from '../state.grpc.client.module';

@Injectable()
export class StateGrpcClientService implements OnModuleInit {
    client: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private clientGrpc: ClientGrpc) {}

    onModuleInit() {
        this.client = this.clientGrpc.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }
}
