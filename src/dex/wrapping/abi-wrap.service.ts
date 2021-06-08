import { Injectable } from '@nestjs/common';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig, scAddress } from '../../config';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';

@Injectable()
export class AbiWrapService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.wrap],
        });
        const abi = new SmartContractAbi(abiRegistry, ['EgldEsdtSwap']);
        const contract = new SmartContract({
            address: new Address(scAddress.wrappingAddress),
            abi: abi,
        });

        return contract;
    }

    async getWrappedEgldTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getWrappedEgldTokenIdentifier(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedEgldTokenID = result.firstValue.valueOf().toString();

        return wrappedEgldTokenID;
    }
}
