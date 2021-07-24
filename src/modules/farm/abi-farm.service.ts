import { Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from './models/farm.args';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiFarmService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmedTokenID = response.firstValue.valueOf().toString();
        return farmedTokenID;
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmTokenID = response.firstValue.valueOf().toString();
        return farmTokenID;
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmingTokenID = response.firstValue.valueOf().toString();
        return farmingTokenID;
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const farmTokenSupply: BigNumber = response.firstValue.valueOf();
        return farmTokenSupply.toFixed();
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenReserve(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const farmingTokenReserve: BigNumber = response.firstValue.valueOf();
        return farmingTokenReserve.toFixed();
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const rewardsPerBlock: BigNumber = response.firstValue.valueOf();
        return rewardsPerBlock.toFixed();
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyPercent([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const penaltyPercent: BigNumber = response.firstValue.valueOf();
        return penaltyPercent.toNumber();
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getMinimumFarmingEpoch(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const minimumFarmingEpochs: BigNumber = response.firstValue.valueOf();
        return minimumFarmingEpochs.toNumber();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const interaction: Interaction = contract.methods.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const rewards = response.firstValue.valueOf();

        return rewards;
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const state = response.firstValue.valueOf();
        return state;
    }
}
