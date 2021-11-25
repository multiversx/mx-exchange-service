import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction, QueryResponseBundle } from '@elrondnetwork/erdjs';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';

@Injectable()
export class AbiFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            return interaction.interpretQueryResponse(queryResponse);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiFarmService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmTokenSupply(
            [],
        );
        const response = await this.getGenericData(contract, interaction);

        return response.firstValue.valueOf().toFixed();
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getFarmingTokenReserve(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPerBlockRewardAmount(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyPercent([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getMinimumFarmingEpoch(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getRewardPerShare([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getLastRewardBlockNonce(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getUndistributedFees(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getCurrentBlockFee(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getDivisionSafetyConstant(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
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
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
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
