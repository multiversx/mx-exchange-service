import { Injectable } from '@nestjs/common';
import {
    AbiRegistry,
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import {
    ProxyProvider,
    Address,
    SmartContract,
    Interaction,
} from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig } from '../../config';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from './dto/farm.args';

@Injectable()
export class AbiFarmService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.gateway,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(farmAddress: string): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.farm],
        });
        const abi = new SmartContractAbi(abiRegistry, ['Farm']);
        const contract = new SmartContract({
            address: new Address(farmAddress),
            abi: abi,
        });
        return contract;
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmedTokenID = response.firstValue.valueOf().toString();
        return farmedTokenID;
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmTokenID = response.firstValue.valueOf().toString();
        return farmTokenID;
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmingTokenID = response.firstValue.valueOf().toString();
        return farmingTokenID;
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const farmTokenSupply = response.firstValue.valueOf().toString();
        return farmTokenSupply;
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmingTokenReserve(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const farmingTokenReserve = response.firstValue.valueOf().toString();
        return farmingTokenReserve;
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const rewardsPerBlock = response.firstValue.valueOf().toString();
        return rewardsPerBlock;
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<string> {
        const contract = await this.getContract(args.farmAddress);
        const interaction: Interaction = contract.methods.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const rewards = response.firstValue.valueOf().toString();

        return rewards;
    }
}
