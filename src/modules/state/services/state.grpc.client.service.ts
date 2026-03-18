import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, timeout } from 'rxjs';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { DEX_STATE_CLIENT } from '../state.grpc.client.module';

const GRPC_DEADLINE_MS = 10_000;

@Injectable()
export class StateGrpcClientService implements OnModuleInit {
    client: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private clientGrpc: ClientGrpc) {}

    onModuleInit() {
        const rawClient = this.clientGrpc.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
        this.client = new Proxy(rawClient, {
            get(target, prop) {
                const fn = (target as any)[prop];
                if (typeof fn !== 'function') return fn;
                return (...args: any[]) =>
                    (fn.apply(target, args) as Observable<any>).pipe(
                        timeout(GRPC_DEADLINE_MS),
                    );
            },
        }) as IDexStateServiceClient;
    }
}
