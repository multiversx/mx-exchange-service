import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    Interaction,
    TypedValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiStakingService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly gatewayService: MXGatewayService,
    ) {
        super(mxProxy);
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        try {
            const contract = await this.mxProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getPairContractManagedAddress();
            const response = await this.getGenericData(interaction);
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenSupply();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardPerShare();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardCapacity();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAnnualPercentageRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getMinUnbondEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPerBlockRewardAmount();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getBurnGasLimit(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getBurnGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getTransferExecGasLimit(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getTransferExecGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getState(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getState([]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().name;
    }

    async calculateRewardsForGivenPosition(
        stakeAddress: string,
        amount: string,
        attributes: string,
    ): Promise<BigNumber> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new BigUIntValue(new BigNumber(amount)),
                BytesValue.fromHex(
                    Buffer.from(attributes, 'base64').toString('hex'),
                ),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        try {
            const contract = await this.mxProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getLockedAssetFactoryManagedAddress();
            const response = await this.getGenericData(interaction);
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async isWhitelisted(
        stakeAddress: string,
        scAddress: string,
    ): Promise<boolean> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const transactionArgs: TypedValue[] = [
            new AddressValue(Address.fromString(scAddress)),
        ];
        const interaction: Interaction =
            contract.methodsExplicit.isWhitelisted(transactionArgs);
        const response = await this.getGenericData(interaction);
        console.log(response);
        return response.firstValue.valueOf();
    }

    async getLastErrorMessage(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}
