import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { QueryResponseBundle, U64Value } from '@elrondnetwork/erdjs';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { PhaseModel } from '../models/price.discovery.model';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';

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

    async getLaunchedTokenBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLaunchedTokenBalance(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAcceptedTokenBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getAcceptedTokenBalance(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getRedeemTokenTotalCirculatingSupply(
            [new U64Value(new BigNumber(1))],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getRedeemTokenTotalCirculatingSupply(
            [new U64Value(new BigNumber(2))],
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

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getCurrentPhase([]);

        const response = await this.getGenericData(contract, interaction);

        const phaseName = response.firstValue.valueOf().name;
        const penalty = response.firstValue.valueOf().fields.penalty_percentage;
        const penaltyPercent = penalty
            ? new BigNumber(penalty).dividedBy(
                  constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY,
              )
            : new BigNumber(0);

        return new PhaseModel({
            name: phaseName,
            penaltyPercent: penaltyPercent.toNumber(),
        });
    }

    async getMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getMinLaunchedTokenPrice(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getNoLimitPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLinearPenaltyPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getFixedPenaltyPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getLockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getLockingScAddress(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getUnlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getUnlockEpoch([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyMinPercentage(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }

    async getPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getPenaltyMaxPercentage(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }

    async getFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methods.getFixedPenaltyPercentage(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }
}
