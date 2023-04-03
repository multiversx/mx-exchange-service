import { MXGatewayService } from './mx.gateway.service';

export class MXGatewayServiceMock {
    async getSCStorageKey(address: string, key: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
}

export const MXGatewayServiceProvider = {
    provide: MXGatewayService,
    useClass: MXGatewayServiceMock,
};
