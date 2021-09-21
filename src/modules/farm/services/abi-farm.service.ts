import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class AbiFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            const farmedTokenID = response.firstValue.valueOf().toString();
            return farmedTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmedTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            const farmTokenID = response.firstValue.valueOf().toString();
            return farmTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            const farmingTokenID = response.firstValue.valueOf().toString();
            return farmingTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmingTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const farmTokenSupply: BigNumber = response.firstValue.valueOf();
            return farmTokenSupply.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmTokenSupply.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenReserve(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const farmingTokenReserve: BigNumber = response.firstValue.valueOf();
            return farmingTokenReserve.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmingTokenReserve.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const rewardsPerBlock: BigNumber = response.firstValue.valueOf();
            return rewardsPerBlock.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getRewardsPerBlock.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyPercent([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const penaltyPercent: BigNumber = response.firstValue.valueOf();
            return penaltyPercent.toNumber();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getPenaltyPercent.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getMinimumFarmingEpoch(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const minimumFarmingEpochs: BigNumber = response.firstValue.valueOf();
            return minimumFarmingEpochs.toNumber();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getMinimumFarmingEpochs.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
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

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const rewards = response.firstValue.valueOf();

            return rewards;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.calculateRewardsForGivenPosition.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const state = response.firstValue.valueOf();
            return state;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getState.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
