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

            return response.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmedTokenID.name,
                error.message,
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

            return response.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmTokenID.name,
                error.message,
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

            return response.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getFarmingTokenID.name,
                error.message,
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
                error.message,
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
                error.message,
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
                error.message,
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
                error.message,
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
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardPerShare([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const rewardPerShare: BigNumber = response.firstValue.valueOf();
            return rewardPerShare.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getLastRewardBlockNonce.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getLastRewardBlockNonce(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const lastRewardBlockNonce: BigNumber = response.firstValue.valueOf();
            return lastRewardBlockNonce.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getLastRewardBlockNonce.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getUndistributedFees(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const undistributedFees: BigNumber = response.firstValue.valueOf();
            return undistributedFees.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getUndistributedFees.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getCurrentBlockFee(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const currentBlockFee = response.firstValue.valueOf();
            return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getCurrentBlockFee.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getDivisionSafetyConstant(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const divisionSafetyConstant: BigNumber = response.firstValue.valueOf();
            return divisionSafetyConstant.toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getDivisionSafetyConstant.name,
                error.message,
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
            return response.firstValue.valueOf();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.calculateRewardsForGivenPosition.name,
                error.message,
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
            return response.firstValue.valueOf();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getState.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getBurnedTokenAmount(
        farmAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getBurnedTokenAmount([
            BytesValue.fromUTF8(tokenID),
        ]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                this.getState.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
