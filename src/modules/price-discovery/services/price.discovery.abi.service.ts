import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { QueryResponseBundle } from '@elrondnetwork/erdjs';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { PhaseModel } from '../models/price.discovery.model';

@Injectable()
export class PriceDiscoveryAbiService {
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
                PriceDiscoveryAbiService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLaunchedTokenId(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getAcceptedTokenId(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getRedeemTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLpTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLaunchedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLaunchedTokenFinalAmount(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getAcceptedTokenFinalAmount(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLpTokensReceived(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.totalLpTokensReceived(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getStartBlock([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getEndBlock([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getPairAddress(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getDexScAddress([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getCurrentPhase([]);

        const response = await this.getGenericData(contract, interaction);
        const phaseName = response.firstValue.valueOf().name;
        const penaltyPercent = response.firstValue
            .valueOf()
            .penalty_percentage?.toNumber();

        return new PhaseModel({
            name: phaseName,
            penaltyPercent: penaltyPercent ? penaltyPercent : 0,
        });
    }
}
