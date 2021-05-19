import { Injectable } from '@nestjs/common';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig } from '../../config';
import { DistributionMilestoneModel } from '../models/distribution.model';
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
            elrondConfig.gateway,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.distribution],
        });
        const abi = new SmartContractAbi(abiRegistry, ['EsdtDistribution']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.distributionAddress),
            abi: abi,
        });

        return contract;
    }

    async getDistributionMilestones(): Promise<DistributionMilestoneModel[]> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionUnlockMilestones(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const rawMilestones: any[] = response.firstValue.valueOf();
        const milestones = rawMilestones.map(rawMilestone => {
            return {
                unlockEpoch: rawMilestone.unlock_epoch.toString(),
                unlockPercentage: rawMilestone.unlock_percent.toString(),
            };
        });

        return milestones;
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
