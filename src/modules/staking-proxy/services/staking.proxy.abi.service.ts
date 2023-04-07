import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiStakingProxyService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpFarmAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getStakingFarmAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPairAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getStakingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getDualYieldTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}
