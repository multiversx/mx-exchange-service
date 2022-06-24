import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    Interaction,
    TypedValue,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';

@Injectable()
export class AbiStakingService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly gatewayService: ElrondGatewayService,
    ) {
        super(elrondProxy, logger);
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        try {
            const contract = await this.elrondProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction = contract.methodsExplicit.getPairContractManagedAddress();
            const response = await this.getGenericData(
                AbiStakingService.name,
                interaction,
            );
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmTokenSupply();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardPerShare();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedRewards();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardCapacity();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getAnnualPercentageRewards();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getMinUnbondEpochs();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getPenaltyPercent(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPenaltyPercent();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getMinimumFarmingEpoch(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getMinimumFarmingEpoch();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPerBlockRewardAmount();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
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
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getBurnGasLimit();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getTransferExecGasLimit(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getTransferExecGasLimit();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getState(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getState([]);
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().name;
    }

    async calculateRewardsForGivenPosition(
        stakeAddress: string,
        amount: string,
        attributes: string,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(amount)),
                BytesValue.fromHex(
                    Buffer.from(attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        try {
            const contract = await this.elrondProxy.getStakingSmartContract(
                stakeAddress,
            );
            const interaction: Interaction = contract.methodsExplicit.getLockedAssetFactoryManagedAddress();
            const response = await this.getGenericData(
                AbiStakingService.name,
                interaction,
            );
            return response.firstValue.valueOf().hex32();
        } catch {
            return undefined;
        }
    }

    async isWhitelisted(
        stakeAddress: string,
        address: string,
    ): Promise<boolean> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const transactionArgs: TypedValue[] = [
            new AddressValue(Address.fromString(address)),
        ];
        const interaction: Interaction = contract.methodsExplicit.isWhitelisted(
            transactionArgs,
        );
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        console.log(response);
        return response.firstValue.valueOf();
    }

    async getLastErrorMessage(stakeAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(
            AbiStakingService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }
}
