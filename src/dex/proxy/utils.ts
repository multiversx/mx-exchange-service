import {
    AbiRegistry,
    Address,
    SmartContract,
    SmartContractAbi,
} from '@elrondnetwork/erdjs/out';
import { abiConfig, elrondConfig } from 'src/config';

export async function getContract() {
    const abiRegistry = await AbiRegistry.load({
        files: [abiConfig.proxy],
    });
    const abi = new SmartContractAbi(abiRegistry, ['ProxyDexImpl']);
    const contract = new SmartContract({
        address: new Address(elrondConfig.proxyDexAddress),
        abi: abi,
    });

    return contract;
}
