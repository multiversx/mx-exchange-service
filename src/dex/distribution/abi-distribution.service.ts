import { Injectable } from '@nestjs/common';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig, scAddress } from '../../config';
import {
    AbiRegistry,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';

@Injectable()
export class AbiDistributionService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.distribution],
        });
        const abi = new SmartContractAbi(abiRegistry, ['Distribution']);
        const contract = new SmartContract({
            address: new Address(scAddress.distributionAddress),
            abi: abi,
        });

        return contract;
    }

    async getCommunityDistribution(): Promise<TypedValue[]> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionAmountAndEpoch(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);

        return result.values;
    }
}
