import {
    AbiRegistry,
    Address,
    SmartContract,
    SmartContractAbi,
} from '@elrondnetwork/erdjs/out';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
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
        const abiRegistry = await AbiRegistry.load({
            files: [contractAbiPath],
        });
        const abi = new SmartContractAbi(abiRegistry, [contractInterface]);

        const contract = new SmartContractProfiler({
            address: Address.Zero(),
            abi: abi,
        });
        return contract;
    }
}
