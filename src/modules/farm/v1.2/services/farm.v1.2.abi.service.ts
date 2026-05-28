import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IFarmAbiServiceV1_2 } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmAbiServiceV1_2
    extends FarmAbiService
    implements IFarmAbiServiceV1_2
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
        protected readonly mxApi: MXApiService,
        protected readonly cacheService: CacheService,
    ) {
        super(mxProxy, gatewayService, mxApi, cacheService);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockedAssetFactoryAddress(farmAddress: string): Promise<string> {
        return this.getLockedAssetFactoryAddressRaw(farmAddress);
    }

    async getLockedAssetFactoryAddressRaw(
        farmAddress: string,
    ): Promise<string> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getLockedAssetFactoryManagedAddress',
        );
        return response.firstValue.valueOf().toBech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async farmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getFarmingTokenReserveRaw(farmAddress);
    }

    async getFarmingTokenReserveRaw(farmAddress: string): Promise<string> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getFarmingTokenReserve',
        );
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async undistributedFees(farmAddress: string): Promise<string> {
        return this.getUndistributedFeesRaw(farmAddress);
    }

    async getUndistributedFeesRaw(farmAddress: string): Promise<string> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getUndistributedFees',
        );
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async currentBlockFee(farmAddress: string): Promise<string> {
        return this.getCurrentBlockFeeRaw(farmAddress);
    }

    async getCurrentBlockFeeRaw(farmAddress: string): Promise<string> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getCurrentBlockFee',
        );
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async lockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return this.getLockedRewardAprMuliplierRaw(farmAddress);
    }

    async getLockedRewardAprMuliplierRaw(farmAddress: string): Promise<number> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getLockedRewardAprMuliplier',
        );
        return response.firstValue.valueOf().integerValue();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: Constants.oneHour(),
    })
    async farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        return this.getFarmMigrationConfigurationRaw(farmAddress);
    }

    async getFarmMigrationConfigurationRaw(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getFarmMigrationConfiguration',
        );
        const decodedResponse = response.firstValue.valueOf();

        return new FarmMigrationConfig({
            migrationRole: decodedResponse.migration_role.name,
            oldFarmAddress: decodedResponse.old_farm_address.toBech32(),
            oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
            newFarmAddress: decodedResponse.new_farm_address.toBech32(),
            newLockedFarmAddress:
                decodedResponse.new_farm_with_lock_address.toBech32(),
        });
    }
}
