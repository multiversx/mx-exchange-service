import { AbiRegistry, Address, SmartContract } from '@multiversx/sdk-core';
import { promises } from 'fs';
import { MXProxyService } from './mx.proxy.service';

export class MXProxyServiceMock extends MXProxyService {
    async getAddressShardID(address: string): Promise<number> {
        return 0;
    }

    async getSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);

        return new SmartContract({
            address: Address.fromString(contractAddress),
            abi: AbiRegistry.create(json),
        });
    }
}

export const MXProxyServiceProvider = {
    provide: MXProxyService,
    useClass: MXProxyServiceMock,
};
