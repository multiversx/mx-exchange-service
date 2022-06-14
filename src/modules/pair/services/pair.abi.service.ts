import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { PairInfoModel } from '../models/pair-info.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { ResultsParser, TokenIdentifierValue } from '@elrondnetwork/erdjs/out';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class PairAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFirstTokenId(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getSecondTokenId(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLpTokenIdentifier(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        const lpTokenID = response.firstValue.valueOf().toString();
        return lpTokenID !== 'EGLD' ? lpTokenID : undefined;
    }

    async getTokenReserve(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getReserve([
            new TokenIdentifierValue(tokenID),
        ]);
        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getTotalSupply(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getReservesAndTotalSupply(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return new PairInfoModel({
            reserves0: response.values[0].valueOf().toFixed(),
            reserves1: response.values[1].valueOf().toFixed(),
            totalSupply: response.values[2].valueOf().toFixed(),
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getTotalFeePercent(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getSpecialFee(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getTrustedSwapPairs(
            [],
        );

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue
            .valueOf()
            .map(swapPair => swapPair.field1.bech32());
    }

    async getInitialLiquidtyAdder(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction = contract.methodsExplicit.getInitialLiquidtyAdder(
                [],
            );
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (queryResponse.returnMessage.includes('bad array length')) {
                return '';
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            if (!response.firstValue.valueOf()) {
                return '';
            }
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes('invalid function')) {
                return '';
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingScAddress.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getState([]);

        const response = await this.getGenericData(
            PairAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().name;
    }

    async getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction = contract.methodsExplicit.getLockingScAddress(
                [],
            );
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (queryResponse.returnMessage.includes('bad array length')) {
                return undefined;
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes('invalid function')) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingScAddress.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getUnlockEpoch(pairAddress: string): Promise<number | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getUnlockEpoch(
            [],
        );
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);

            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            const unlockEpoch = response.firstValue.valueOf();
            return unlockEpoch !== undefined
                ? unlockEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes('invalid function')) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getUnlockEpoch.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLockingDeadlineEpoch(
            [],
        );
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);

            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            const lockingDeadlineEpoch = response.firstValue.valueOf();
            return lockingDeadlineEpoch !== undefined
                ? lockingDeadlineEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes('invalid function')) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingDeadlineEpoch.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }
}
