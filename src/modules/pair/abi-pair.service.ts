import { Inject, Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address } from '@elrondnetwork/erdjs';
import { PairInfoModel } from './models/pair-info.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class AbiPairService {
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
                AbiPairService.name,
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
                AbiPairService.name,
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
                AbiPairService.name,
                this.getLpTokenID.name,
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
                AbiPairService.name,
                this.getPairInfoMetadata.name,
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
                AbiPairService.name,
                this.getTemporaryFunds.name,
                error,
            );
            this.logger.error(logMessage);
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
                AbiPairService.name,
                this.getState.name,
                error,
            );
            this.logger.error(logMessage);
        }
    }
}
