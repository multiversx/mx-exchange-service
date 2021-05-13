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
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
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

    async getDistributedTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getDistributedTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const distributedTokenID = result.firstValue.valueOf();

        return distributedTokenID;
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLockedTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf();

        return lockedTokenID;
    }

    async getWrappedLpTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getWrappedLpTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedLpTokenID = result.firstValue.valueOf();

        return wrappedLpTokenID;
    }

    async getWrappedFarmTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getWrappedFarmTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedFarmTokenID = result.firstValue.valueOf();

        return wrappedFarmTokenID;
    }

    async getAcceptedLockedTokensID(): Promise<TypedValue[]> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getAcceptedLockedAssetsTokenIds(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        return response.values;
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
        const result = interaction.interpretQueryResponse(queryResponse);

        const milestones: DistributionMilestoneModel[] = result.values.map(
            rawMilestone => {
                const milestone = rawMilestone.valueOf();
                return {
                    unlockEpoch: milestone.unlock_epoch,
                    unlockPercentage: milestone.unlock_precent,
                };
            },
        );

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

    async getIntermediatedPairsAddress(): Promise<string[]> {
        const contract = await this.getContract();

        const interaction: Interaction = contract.methods.getIntermediatedPairs(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const pairs = result.values.map(pairAddress => {
            return pairAddress.valueOf();
        });

        return pairs;
    }

    async getIntermediatedFarmsAddress(): Promise<string[]> {
        const contract = await this.getContract();

        const interaction: Interaction = contract.methods.getIntermediatedFarms(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const farms = result.values.map(farmAddress => {
            return farmAddress.valueOf();
        });

        return farms;
    }
}
