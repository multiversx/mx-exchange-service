import {
    BigUIntValue,
    BytesValue,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { Address, Interaction, ReturnCode } from '@multiversx/sdk-core';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { IFarmAbiService } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';

export class FarmAbiService
    extends GenericAbiService
    implements IFarmAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
        protected readonly apiService: MXApiService,
        protected readonly cacheService: CacheService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmedTokenID(farmAddress: string): Promise<string> {
        return await this.getFarmedTokenIDRaw(farmAddress);
    }

    async getFarmedTokenIDRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmTokenID(farmAddress: string): Promise<string> {
        return await this.getFarmTokenIDRaw(farmAddress);
    }

    async getFarmTokenIDRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getAllFarmTokenIds(farmAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
            this.cacheService,
            farmAddresses,
            'farm.farmTokenID',
            this.farmTokenID.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmingTokenID(farmAddress: string): Promise<string> {
        return await this.getFarmingTokenIDRaw(farmAddress);
    }

    async getFarmingTokenIDRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async farmTokenSupply(farmAddress: string): Promise<string> {
        return await this.getFarmTokenSupplyRaw(farmAddress);
    }

    async getFarmTokenSupplyRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenSupply();
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
    async rewardsPerBlock(farmAddress: string): Promise<string> {
        return await this.getRewardsPerBlockRaw(farmAddress);
    }

    async getRewardsPerBlockRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getPerBlockRewardAmount();
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
    async penaltyPercent(farmAddress: string): Promise<number> {
        return await this.getPenaltyPercentRaw(farmAddress);
    }

    async getPenaltyPercentRaw(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyPercent();
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
    async minimumFarmingEpochs(farmAddress: string): Promise<number> {
        return await this.getMinimumFarmingEpochsRaw(farmAddress);
    }

    async getMinimumFarmingEpochsRaw(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getMinimumFarmingEpoch();
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
    async rewardPerShare(farmAddress: string): Promise<string> {
        return await this.getRewardPerShareRaw(farmAddress);
    }

    async getRewardPerShareRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardPerShare();
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
    async rewardReserve(farmAddress: string): Promise<string> {
        return await this.getRewardReserveRaw(farmAddress);
    }

    async getRewardReserveRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardReserve();
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
    async lastRewardBlockNonce(farmAddress: string): Promise<number> {
        return await this.getLastRewardBlockNonceRaw(farmAddress);
    }

    async getLastRewardBlockNonceRaw(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: Constants.oneHour(),
    })
    async divisionSafetyConstant(farmAddress: string): Promise<string> {
        return await this.getDivisionSafetyConstantRaw(farmAddress);
    }

    async getDivisionSafetyConstantRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async state(farmAddress: string): Promise<string> {
        return await this.getStateRaw(farmAddress);
    }

    async getStateRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction = contract.methodsExplicit.getState();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().name;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async produceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return await this.getProduceRewardsEnabledRaw(farmAddress);
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
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async burnGasLimit(farmAddress: string): Promise<string | undefined> {
        return await this.getBurnGasLimitRaw(farmAddress);
    }

    async getBurnGasLimitRaw(farmAddress: string): Promise<string | undefined> {
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
    async transferExecGasLimit(farmAddress: string): Promise<string> {
        return await this.getTransferExecGasLimitRaw(farmAddress);
    }

    async getTransferExecGasLimitRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTransferExecGasLimit();
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
    async pairContractAddress(farmAddress: string): Promise<string> {
        return await this.getPairContractAddressRaw(farmAddress);
    }

    async getPairContractAddressRaw(farmAddress: string): Promise<string> {
        try {
            const contract = await this.mxProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getPairContractManagedAddress();
            const response = await this.getGenericData(interaction);
            if (response.returnCode.equals(ReturnCode.FunctionNotFound)) {
                return Address.Zero().bech32();
            }
            return response.firstValue.valueOf().bech32();
        } catch {
            return undefined;
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lastErrorMessage(farmAddress: string): Promise<string> {
        return await this.getLastErrorMessageRaw(farmAddress);
    }

    async getLastErrorMessageRaw(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async ownerAddress(farmAddress: string): Promise<string> {
        return await this.getOwnerAddressRaw(farmAddress);
    }

    async getOwnerAddressRaw(farmAddress: string): Promise<string> {
        return (await this.apiService.getAccountStats(farmAddress))
            .ownerAddress;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async farmShard(farmAddress: string): Promise<number> {
        return await this.getFarmShardRaw(farmAddress);
    }

    async getFarmShardRaw(farmAddress: string): Promise<number> {
        return (await this.apiService.getAccountStats(farmAddress)).shard;
    }
}
