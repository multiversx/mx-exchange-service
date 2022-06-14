import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { U64Value } from '@elrondnetwork/erdjs';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class PriceDiscoveryAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLaunchedTokenId(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getAcceptedTokenId(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRedeemTokenId(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getLaunchedTokenBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLaunchedTokenBalance(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getAcceptedTokenBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getAcceptedTokenBalance(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRedeemTokenTotalCirculatingSupply(
            [new U64Value(new BigNumber(1))],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRedeemTokenTotalCirculatingSupply(
            [new U64Value(new BigNumber(2))],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getStartBlock(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getEndBlock(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getCurrentPhase(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );

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
        const interaction: Interaction = contract.methodsExplicit.getMinLaunchedTokenPrice(
            [],
        );

        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getNoLimitPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLinearPenaltyPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFixedPenaltyPhaseDurationBlocks(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getLockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLockingScAddress(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getUnlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getUnlockEpoch(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPenaltyMinPercentage(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
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
        const interaction: Interaction = contract.methodsExplicit.getPenaltyMaxPercentage(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
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
        const interaction: Interaction = contract.methodsExplicit.getFixedPenaltyPercentage(
            [],
        );
        const response = await this.getGenericData(
            PriceDiscoveryAbiService.name,
            interaction,
        );
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }
}
