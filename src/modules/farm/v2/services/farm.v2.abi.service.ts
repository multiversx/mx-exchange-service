import {
    Address,
    AddressType,
    AddressValue,
    BigUIntType,
    BigUIntValue,
    Field,
    FieldDefinition,
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getBoostedYieldsRewardsPercentage',
        );
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

        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getLockingScAddress',
        );
        return response.firstValue.valueOf().toBech32();
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

        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getLockEpochs',
        );
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getRemainingBoostedRewardsToDistribute',
            [new U32Value(new BigNumber(week))],
        );
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getUndistributedBoostedRewards',
        );
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
            'lastCollectUndistWeek',
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getBoostedYieldsFactors',
        );
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
        const abi = await this.mxProxy.getFarmAbi(scAddress);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getAccumulatedRewardsForWeek',
            [new U32Value(new BigNumber(week))],
        );
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getEnergyFactoryAddress',
        );
        return response.firstValue.valueOf().toBech32();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const abi = await this.mxProxy.getFarmAbi(args.farmAddress);
        const decodedAttributes = FarmTokenAttributesV2.fromAttributes(
            args.attributes,
        );
        const response = await this.getGenericData(
            abi,
            args.farmAddress,
            'calculateRewardsForGivenPosition',
            [
                new AddressValue(Address.newFromBech32(args.user)),
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
                                Address.newFromBech32(
                                    decodedAttributes.originalOwner,
                                ),
                            ),
                            'original_owner',
                        ),
                    ],
                ),
            ],
        );
        return response.firstValue.valueOf();
    }

    async getBurnGasLimitRaw(farmAddress: string): Promise<string | undefined> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getBurnGasLimit',
        );
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getUserTotalFarmPosition',
            [new AddressValue(Address.newFromBech32(userAddress))],
        );

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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getFarmPositionMigrationNonce',
        );
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
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getFarmSupplyForWeek',
            [new U32Value(new BigNumber(week))],
        );
        return response.firstValue.valueOf().toFixed();
    }
}
