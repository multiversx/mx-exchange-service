import { MXGatewayService } from './mx.gateway.service';

export class MXGatewayServiceMock {
    async getSCStorageKey(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async getSCStorageKeys(): Promise<any> {
        throw new Error('Method not implemented.');
    }
}

export const MXGatewayServiceProvider = {
    provide: MXGatewayService,
    useClass: MXGatewayServiceMock,
};
