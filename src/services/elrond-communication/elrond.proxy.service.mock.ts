import {
    AbiRegistry,
    Address,
    SmartContract,
    SmartContractAbi,
} from '@multiversx/sdk-core';
import { promises } from 'fs';
import { ElrondProxyService } from './elrond-proxy.service';

export class ElrondProxyServiceMock extends ElrondProxyService {
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
        const abiRegistry = AbiRegistry.create(json);
        const abi = new SmartContractAbi(abiRegistry, [contractInterface]);

        return new SmartContract({
            address: Address.fromString(contractAddress),
            abi,
        });
    }
}
