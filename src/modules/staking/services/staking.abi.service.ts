import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    Interaction,
    ReturnCode,
    TypedValue,
    U32Value,
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
import { BoostedYieldsFactors } from 'src/modules/farm/models/farm.v2.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';

@Injectable()
export class StakingAbiService
    extends GenericAbiService
    implements IStakingAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly gatewayService: MXGatewayService,
        private readonly apiService: MXApiService,
        private readonly cachingService: CacheService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async farmTokenID(stakeAddress: string): Promise<string> {
        return this.getFarmTokenIDRaw(stakeAddress);
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

    async getAllFarmTokenIds(stakeAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            stakeAddresses,
            'stake.farmTokenID',
            this.farmTokenID.bind(this),
            CacheTtlInfo.TokenID,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async farmingTokenID(stakeAddress: string): Promise<string> {
        return this.getFarmingTokenIDRaw(stakeAddress);
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

    async getAllFarmingTokensIds(stakeAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            stakeAddresses,
            'stake.farmingTokenID',
            this.farmingTokenID.bind(this),
            CacheTtlInfo.TokenID,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async rewardTokenID(stakeAddress: string): Promise<string> {
        return this.getRewardTokenIDRaw(stakeAddress);
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
        return this.getFarmTokenSupplyRaw(stakeAddress);
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
        return this.getRewardPerShareRaw(stakeAddress);
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
        return this.getAccumulatedRewardsRaw(stakeAddress);
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

    async getAllAccumulatedRewards(
        stakeAddresses: string[],
    ): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            stakeAddresses,
            'stake.accumulatedRewards',
            this.accumulatedRewards.bind(this),
            CacheTtlInfo.ContractInfo,
        );
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
        return this.getRewardCapacityRaw(stakeAddress);
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

    async getAllRewardCapacity(stakeAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            stakeAddresses,
            'stake.rewardCapacity',
            this.rewardCapacity.bind(this),
            CacheTtlInfo.ContractInfo,
        );
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
        return this.getAnnualPercentageRewardsRaw(stakeAddress);
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
        return this.getMinUnbondEpochsRaw(stakeAddress);
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
        return this.getPerBlockRewardsAmountRaw(stakeAddress);
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
        return this.getLastRewardBlockNonceRaw(stakeAddress);
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
        return this.getDivisionSafetyConstantRaw(stakeAddress);
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
        return this.getProduceRewardsEnabledRaw(stakeAddress);
    }

    async getProduceRewardsEnabledRaw(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getAllProduceRewardsEnabled(
        stakeAddresses: string[],
    ): Promise<boolean[]> {
        return getAllKeys<boolean>(
            this.cachingService,
            stakeAddresses,
            'stake.produceRewardsEnabled',
            this.produceRewardsEnabled.bind(this),
            CacheTtlInfo.ContractState,
        );
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
        return this.getStateRaw(stakeAddress);
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
        return this.getLockedAssetFactoryAddressRaw(stakeAddress);
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
        return this.isWhitelistedRaw(stakeAddress, scAddress);
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
        return this.getLastErrorMessageRaw(stakeAddress);
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
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(stakeAddress: string): Promise<string> {
        return this.getEnergyFactoryAddressRaw(stakeAddress);
    }

    async getEnergyFactoryAddressRaw(stakeAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async boostedYieldsRewardsPercenatage(
        stakeAddress: string,
    ): Promise<number> {
        return this.getBoostedYieldsRewardsPercenatageRaw(stakeAddress);
    }

    async getBoostedYieldsRewardsPercenatageRaw(
        stakeAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsRewardsPercentage();
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
    async boostedYieldsFactors(
        stakeAddress: string,
    ): Promise<BoostedYieldsFactors> {
        return this.getBoostedYieldsFactorsRaw(stakeAddress);
    }

    async getBoostedYieldsFactorsRaw(
        stakeAddress: string,
    ): Promise<BoostedYieldsFactors> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsFactors();
        const response = await this.getGenericData(interaction);
        const rawBoostedYieldsFactors = response.firstValue.valueOf();
        return new BoostedYieldsFactors({
            maxRewardsFactor:
                rawBoostedYieldsFactors.max_rewards_factor.toFixed(),
            userRewardsEnergy:
                rawBoostedYieldsFactors.user_rewards_energy_const.toFixed(),
            userRewardsFarm:
                rawBoostedYieldsFactors.user_rewards_farm_const.toFixed(),
            minEnergyAmount:
                rawBoostedYieldsFactors.min_energy_amount.toFixed(),
            minFarmAmount: rawBoostedYieldsFactors.min_farm_amount.toFixed(),
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async accumulatedRewardsForWeek(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        return this.getAccumulatedRewardsForWeekRaw(stakeAddress, week);
    }

    async getAccumulatedRewardsForWeekRaw(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedRewardsForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async undistributedBoostedRewards(stakeAddress: string): Promise<string> {
        return this.getUndistributedBoostedRewardsRaw(stakeAddress);
    }

    async getUndistributedBoostedRewardsRaw(
        stakeAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getUndistributedBoostedRewards();
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
    async lastUndistributedBoostedRewardsCollectWeek(
        stakeAddress: string,
    ): Promise<number> {
        return this.gatewayService.getSCStorageKey(
            stakeAddress,
            'lastUndistributedBoostedRewardsCollectWeek',
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async remainingBoostedRewardsToDistribute(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        return this.getRemainingBoostedRewardsToDistributeRaw(
            stakeAddress,
            week,
        );
    }

    async getRemainingBoostedRewardsToDistributeRaw(
        stakeAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRemainingBoostedRewardsToDistribute([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async farmSupplyForWeek(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        return this.getFarmSupplyForWeekRaw(farmAddress, week);
    }

    async getFarmSupplyForWeekRaw(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            farmAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmSupplyForWeek([
                new U32Value(new BigNumber(week)),
            ]);
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
    async userTotalStakePosition(
        stakeAddress: string,
        userAddress: string,
    ): Promise<string> {
        return this.getUserTotalStakePositionRaw(stakeAddress, userAddress);
    }

    async getUserTotalStakePositionRaw(
        stakeAddress: string,
        userAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getUserTotalFarmPosition([
                new AddressValue(Address.fromString(userAddress)),
            ]);
        const response = await this.getGenericData(interaction);

        if (
            response.returnCode.equals(ReturnCode.FunctionNotFound) ||
            response.returnCode.equals(ReturnCode.UserError)
        ) {
            return '0';
        }

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
    async farmPositionMigrationNonce(stakeAddress: string): Promise<number> {
        return this.getFarmPositionMigrationNonceRaw(stakeAddress);
    }

    async getFarmPositionMigrationNonceRaw(
        stakeAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getFarmPositionMigrationNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stake',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async stakingShard(stakeAddress: string): Promise<number> {
        return this.getStakingShardRaw(stakeAddress);
    }

    async getStakingShardRaw(stakeAddress: string): Promise<number> {
        return (await this.apiService.getAccountStats(stakeAddress)).shard;
    }
}
