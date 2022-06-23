import { Interaction } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PairTokens } from 'src/modules/pair/models/pair.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { PairMetadata } from '../models/pair.metadata.model';
@Injectable()
export class AbiRouterService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getAllPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairsManagedAddresses();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(pairAddress => {
            return pairAddress.toString();
        });
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairContractMetadata();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(v => {
            return new PairMetadata({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
                address: v.address.toString(),
            });
        });
    }

    async getPairCreationEnabled(): Promise<boolean> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getPairCreationEnabled();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getLastErrorMessage(): Promise<string> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getState(): Promise<boolean> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getState();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getOwner(): Promise<string> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getOwner();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().bech32();
    }

    async getAllPairsManagedAddresses(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairsManagedAddresses();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(address => address.bech32());
    }

    async getAllPairTokens(): Promise<PairTokens[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairTokens();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(v => {
            return new PairTokens({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
            });
        });
    }

    async getPairTemplateAddress(): Promise<string> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getPairTemplateAddress();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().bech32();
    }

    async getTemporaryOwnerPeriod(): Promise<string> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getTemporaryOwnerPeriod();
        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }
}
