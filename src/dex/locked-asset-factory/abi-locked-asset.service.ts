import { Injectable } from '@nestjs/common';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig } from '../../config';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';

@Injectable()
export class AbiLockedAssetService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.gateway,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.lockedAssetFactory],
        });
        const abi = new SmartContractAbi(abiRegistry, ['LockedAssetFactory']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.lockedAssetAddress),
            abi: abi,
        });

        return contract;
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLockedTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf().toString();

        return lockedTokenID;
    }
}
