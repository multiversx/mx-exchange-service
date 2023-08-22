import {
    Address,
    AddressValue,
    BigUIntType,
    BigUIntValue,
    Field,
    FieldDefinition,
    Interaction,
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
import { FarmTokenAttributesV1_3 } from '@multiversx/sdk-exchange';
import { FarmRewardType } from '../../models/farm.model';
import { farmType } from 'src/utils/farm.utils';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from '../../../../services/multiversx-communication/mx.gateway.service';
import { tokenNonce } from '../../../../utils/token.converters';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IFarmAbiServiceV2 } from './interfaces';

@Injectable()
export class FarmAbiServiceV2
    extends FarmAbiService
    implements IFarmAbiServiceV2
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
        protected readonly mxApi: MXApiService,
    ) {
        super(mxProxy, gatewayService, mxApi);
    }

    async getLastErrorMessageRaw(): Promise<string> {
        return undefined;
    }

    async getTransferExecGasLimitRaw(): Promise<string> {
        return undefined;
    }

    @ErrorLoggerAsync({
        className: FarmAbiServiceV2.name,
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
        return await this.getBoostedYieldsRewardsPercenatageRaw(farmAddress);
    }

    async getBoostedYieldsRewardsPercenatageRaw(
        farmAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsRewardsPercenatage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        className: FarmAbiServiceV2.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockingScAddress(farmAddress: string): Promise<string> {
        return await this.getLockingScAddressRaw(farmAddress);
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
        className: FarmAbiServiceV2.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockEpochs(farmAddress: string): Promise<number> {
        return await this.getLockEpochsRaw(farmAddress);
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
        className: FarmAbiServiceV2.name,
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
        return await this.getRemainingBoostedRewardsToDistributeRaw(
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
        className: FarmAbiServiceV2.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async undistributedBoostedRewards(farmAddress: string): Promise<string> {
        return await this.getUndistributedBoostedRewardsRaw(farmAddress);
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
        className: FarmAbiServiceV2.name,
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
        className: FarmAbiServiceV2.name,
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
        return await this.getBoostedYieldsFactorsRaw(farmAddress);
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
        className: FarmAbiServiceV2.name,
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
        return await this.getAccumulatedRewardsForWeekRaw(scAddress, week);
    }

    async getAccumulatedRewardsForWeekRaw(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const hexValue = await this.gatewayService.getSCStorageKeys(scAddress, [
            'accumulatedRewardsForWeek',
            week,
        ]);
        return new BigNumber(hexValue, 16).integerValue().toFixed();
        // TODO: remove the code above after the contracts are upgraded with the required view
        const contract = await this.mxProxy.getFarmSmartContract(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedFees([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue().toFixed();
    }

    @ErrorLoggerAsync({
        className: FarmAbiServiceV2.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(farmAddress: string): Promise<string> {
        return await this.getEnergyFactoryAddressRaw(farmAddress);
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
        console.log({
            service: FarmAbiServiceV2.name,
            method: this.calculateRewardsForGivenPosition.name,
        });
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const decodedAttributes = FarmTokenAttributesV1_3.fromAttributes(
            args.attributes,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new AddressValue(Address.fromString(args.user)),
                new U64Value(new BigNumber(tokenNonce(args.identifier))),
                new BigUIntValue(new BigNumber(args.liquidity)),
                new Struct(
                    new StructType('FarmTokenAttributes', [
                        new FieldDefinition(
                            'reward_per_share',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'original_entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'initial_farming_amount',
                            '',
                            new BigUIntType(),
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
                                new BigNumber(
                                    decodedAttributes.originalEnteringEpoch,
                                ),
                            ),
                            'original_entering_epoch',
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
                                    decodedAttributes.initialFarmingAmount,
                                ),
                            ),
                            'initial_farming_amount',
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
                    ],
                ),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
