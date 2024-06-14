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
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IStakingAbiService } from './interfaces';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';

@Injectable()
export class StakingAbiService
    extends GenericAbiService
    implements IStakingAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly gatewayService: MXGatewayService,
        private readonly apiService: MXApiService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneHour(),
    })
    async pairContractAddress(stakeAddress: string): Promise<string> {
        return await this.getPairContractAddressRaw(stakeAddress);
    }

    async getPairContractAddressRaw(stakeAddress: string): Promise<string> {
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmTokenID(stakeAddress: string): Promise<string> {
        return await this.getFarmTokenIDRaw(stakeAddress);
    }

    async getFarmTokenIDRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmingTokenID(stakeAddress: string): Promise<string> {
        return await this.getFarmingTokenIDRaw(stakeAddress);
    }

    async getFarmingTokenIDRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async rewardTokenID(stakeAddress: string): Promise<string> {
        return await this.getRewardTokenIDRaw(stakeAddress);
    }

    async getRewardTokenIDRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async farmTokenSupply(stakeAddress: string): Promise<string> {
        return await this.getFarmTokenSupplyRaw(stakeAddress);
    }

    async getFarmTokenSupplyRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenSupply();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async rewardPerShare(stakeAddress: string): Promise<string> {
        return await this.getRewardPerShareRaw(stakeAddress);
    }

    async getRewardPerShareRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardPerShare();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async accumulatedRewards(stakeAddress: string): Promise<string> {
        return await this.getAccumulatedRewardsRaw(stakeAddress);
    }

    async getAccumulatedRewardsRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async rewardCapacity(stakeAddress: string): Promise<string> {
        return await this.getRewardCapacityRaw(stakeAddress);
    }

    async getRewardCapacityRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRewardCapacity();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async annualPercentageRewards(stakeAddress: string): Promise<string> {
        return await this.getAnnualPercentageRewardsRaw(stakeAddress);
    }

    async getAnnualPercentageRewardsRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAnnualPercentageRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minUnbondEpochs(stakeAddress: string): Promise<number> {
        return await this.getMinUnbondEpochsRaw(stakeAddress);
    }

    async getMinUnbondEpochsRaw(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getMinUnbondEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async perBlockRewardsAmount(stakeAddress: string): Promise<string> {
        return await this.getPerBlockRewardsAmountRaw(stakeAddress);
    }

    async getPerBlockRewardsAmountRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPerBlockRewardAmount();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return await this.getLastRewardBlockNonceRaw(stakeAddress);
    }

    async getLastRewardBlockNonceRaw(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async divisionSafetyConstant(stakeAddress: string): Promise<number> {
        return await this.getDivisionSafetyConstantRaw(stakeAddress);
    }

    async getDivisionSafetyConstantRaw(stakeAddress: string): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async produceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return await this.getProduceRewardsEnabledRaw(stakeAddress);
    }

    async getProduceRewardsEnabledRaw(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneHour(),
    })
    async burnGasLimit(stakeAddress: string): Promise<string> {
        return await this.getBurnGasLimitRaw(stakeAddress);
    }

    async getBurnGasLimitRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getBurnGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneHour(),
    })
    async transferExecGasLimit(stakeAddress: string): Promise<string> {
        return await this.getTransferExecGasLimitRaw(stakeAddress);
    }

    async getTransferExecGasLimitRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getTransferExecGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async state(stakeAddress: string): Promise<string> {
        return await this.getStateRaw(stakeAddress);
    }

    async getStateRaw(stakeAddress: string): Promise<string> {
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneHour(),
    })
    async lockedAssetFactoryAddress(stakeAddress: string): Promise<string> {
        return await this.getLockedAssetFactoryAddressRaw(stakeAddress);
    }

    async getLockedAssetFactoryAddressRaw(
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneHour(),
    })
    async isWhitelisted(
        stakeAddress: string,
        scAddress: string,
    ): Promise<boolean> {
        return await this.isWhitelistedRaw(stakeAddress, scAddress);
    }

    async isWhitelistedRaw(
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: Constants.oneMinute(),
    })
    async lastErrorMessage(stakeAddress: string): Promise<string> {
        return await this.getLastErrorMessageRaw(stakeAddress);
    }

    async getLastErrorMessageRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async stakingDeployedTimestamp(stakingAddress: string): Promise<number> {
        return await this.getStakingDeployedTimestampRaw(stakingAddress);
    }

    async getStakingDeployedTimestampRaw(
        stakingAddress: string,
    ): Promise<number | undefined> {
        try {
            const addressDetails = await this.apiService.getAccountStats(
                stakingAddress,
            );
            return addressDetails.deployedAt ?? undefined;
        } catch (error) {
            if (error.message.includes('Account not found')) {
                return undefined;
            }
            throw error;
        }
    }
}
