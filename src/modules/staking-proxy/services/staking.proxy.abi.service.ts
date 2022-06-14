import { Interaction } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';

@Injectable()
export class AbiStakingProxyService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLpFarmAddress(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getStakingFarmAddress(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPairAddress(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getStakingTokenId(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmTokenId(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getDualYieldTokenId(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLpFarmTokenId(
            [],
        );
        const response = await this.getGenericData(
            AbiStakingProxyService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }
}
