import { AbiRegistry } from '@multiversx/sdk-core';
import { promises } from 'fs';
import { MXProxyService } from './mx.proxy.service';

export class MXProxyServiceMock extends MXProxyService {
    async getAddressShardID(address: string): Promise<number> {
        return 0;
    }

    async getAbi(
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<AbiRegistry> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);
        return AbiRegistry.create(json);
    }
}

export const MXProxyServiceProvider = {
    provide: MXProxyService,
    useClass: MXProxyServiceMock,
};
