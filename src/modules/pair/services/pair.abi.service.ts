import { Inject, Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address } from '@elrondnetwork/erdjs';
import { PairInfoModel } from '../models/pair-info.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';

@Injectable()
export class PairAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFirstTokenId([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const firstTokenID = response.firstValue?.valueOf().toString();

            return firstTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getFirstTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSecondTokenId([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const secondTokenID = response.firstValue.valueOf().toString();

            return secondTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getSecondTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const getLpTokenInteraction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                getLpTokenInteraction.buildQuery(),
            );
            const response = getLpTokenInteraction.interpretQueryResponse(
                queryResponse,
            );

            const lpTokenID = response.firstValue.valueOf().toString();

            return lpTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLpTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTokenReserve(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getReserve([
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
                PairAbiService.name,
                this.getTokenReserve.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getTotalSupply([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response.firstValue.valueOf().toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getTotalSupply.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return new PairInfoModel({
                reserves0: response.values[0].valueOf().toFixed(),
                reserves1: response.values[1].valueOf().toFixed(),
                totalSupply: response.values[2].valueOf().toFixed(),
            });
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getPairInfoMetadata.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTotalFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getTotalFeePercent(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response.firstValue.valueOf().toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getTotalFeePercent.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getSpecialFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getSpecialFee([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response.firstValue.valueOf().toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getSpecialFeePercent.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(callerAddress).hex()),
            BytesValue.fromUTF8(tokenID),
        ]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );

            const response = interaction.interpretQueryResponse(queryResponse);

            const temporaryFunds = response.firstValue.valueOf();

            return temporaryFunds;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getTemporaryFunds.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
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
                PairAbiService.name,
                this.getState.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
