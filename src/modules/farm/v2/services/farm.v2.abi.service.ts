import {
    Address,
    AddressType,
    AddressValue,
    BigUIntType,
    BigUIntValue,
    Field,
    FieldDefinition,
    Interaction,
    ReturnCode,
    Struct,
    StructType,
    U32Value,
    U64Type,
    U64Value,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { FarmTokenAttributesV2 } from '@multiversx/sdk-exchange';
import { FarmRewardType } from '../../models/farm.model';
import { farmType } from 'src/utils/farm.utils';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from '../../../../services/multiversx-communication/mx.gateway.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IFarmAbiServiceV2 } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmAbiServiceV2
    extends FarmAbiService
    implements IFarmAbiServiceV2
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
        protected readonly mxApi: MXApiService,
        protected readonly cacheService: CacheService,
    ) {
        super(mxProxy, gatewayService, mxApi, cacheService);
    }

    async getLastErrorMessageRaw(farmAddress: string): Promise<string> {
        return undefined;
    }

    async getTransferExecGasLimitRaw(farmAddress: string): Promise<string> {
        return undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async boostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        return this.getBoostedYieldsRewardsPercenatageRaw(farmAddress);
    }

    async getBoostedYieldsRewardsPercenatageRaw(
        farmAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsRewardsPercentage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockingScAddress(farmAddress: string): Promise<string> {
        return this.getLockingScAddressRaw(farmAddress);
    }

    async getLockingScAddressRaw(farmAddress: string): Promise<string> {
        if (farmType(farmAddress) === FarmRewardType.UNLOCKED_REWARDS) {
            return undefined;
        }

        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getLockingScAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockEpochs(farmAddress: string): Promise<number> {
        return this.getLockEpochsRaw(farmAddress);
    }

    async getLockEpochsRaw(farmAddress: string): Promise<number> {
        if (farmType(farmAddress) === FarmRewardType.UNLOCKED_REWARDS) {
            return undefined;
        }

        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getLockEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async remainingBoostedRewardsToDistribute(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        return this.getRemainingBoostedRewardsToDistributeRaw(
            farmAddress,
            week,
        );
    }

    async getRemainingBoostedRewardsToDistributeRaw(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
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
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async undistributedBoostedRewards(farmAddress: string): Promise<string> {
        return this.getUndistributedBoostedRewardsRaw(farmAddress);
    }

    async getUndistributedBoostedRewardsRaw(
        farmAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getUndistributedBoostedRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lastUndistributedBoostedRewardsCollectWeek(
        farmAddress: string,
    ): Promise<number> {
        return this.gatewayService.getSCStorageKey(
            farmAddress,
            'lastUndistributedBoostedRewardsCollectWeek',
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async boostedYieldsFactors(
        farmAddress: string,
    ): Promise<BoostedYieldsFactors> {
        return this.getBoostedYieldsFactorsRaw(farmAddress);
    }

    async getBoostedYieldsFactorsRaw(
        farmAddress: string,
    ): Promise<BoostedYieldsFactors> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async accumulatedRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.getAccumulatedRewardsForWeekRaw(scAddress, week);
    }

    async getAccumulatedRewardsForWeekRaw(
        scAddress: string,
        week: number,
    ): Promise<string> {
        // TODO: remove the code above after the contracts are upgraded with the required view
        const contract = await this.mxProxy.getFarmSmartContract(scAddress);
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(farmAddress: string): Promise<string> {
        return this.getEnergyFactoryAddressRaw(farmAddress);
    }

    async getEnergyFactoryAddressRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const decodedAttributes = FarmTokenAttributesV2.fromAttributes(
            args.attributes,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new AddressValue(Address.fromString(args.user)),
                new BigUIntValue(new BigNumber(args.liquidity)),
                new Struct(
                    new StructType('FarmTokenAttributes', [
                        new FieldDefinition(
                            'reward_per_share',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'compounded_reward',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'current_farm_amount',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'original_owner',
                            '',
                            new AddressType(),
                        ),
                    ]),
                    [
                        new Field(
                            new BigUIntValue(
                                new BigNumber(decodedAttributes.rewardPerShare),
                            ),
                            'reward_per_share',
                        ),
                        new Field(
                            new U64Value(
                                new BigNumber(decodedAttributes.enteringEpoch),
                            ),
                            'entering_epoch',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.compoundedReward,
                                ),
                            ),
                            'compounded_reward',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.currentFarmAmount,
                                ),
                            ),
                            'current_farm_amount',
                        ),
                        new Field(
                            new AddressValue(
                                Address.fromString(
                                    decodedAttributes.originalOwner,
                                ),
                            ),
                            'original_owner',
                        ),
                    ],
                ),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getBurnGasLimitRaw(farmAddress: string): Promise<string | undefined> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getBurnGasLimit();
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
    async userTotalFarmPosition(
        farmAddress: string,
        userAddress: string,
    ): Promise<string> {
        return this.getUserTotalFarmPositionRaw(farmAddress, userAddress);
    }

    async getUserTotalFarmPositionRaw(
        farmAddress: string,
        userAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async farmPositionMigrationNonce(farmAddress: string): Promise<number> {
        return this.getFarmPositionMigrationNonceRaw(farmAddress);
    }

    async getFarmPositionMigrationNonceRaw(
        farmAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmPositionMigrationNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
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
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmSupplyForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }
}
