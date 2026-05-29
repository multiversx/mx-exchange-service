import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IFarmAbiServiceV1_3 } from './interfaces';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmAbiServiceV1_3
    extends FarmAbiService
    implements IFarmAbiServiceV1_3
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
    async lockedAssetFactoryAddress(
        farmAddress: string,
    ): Promise<string | undefined> {
        return this.getLockedAssetFactoryAddressRaw(farmAddress);
    }

    async getLockedAssetFactoryAddressRaw(
        farmAddress: string,
    ): Promise<string | undefined> {
        try {
            const abi = await this.mxProxy.getFarmAbi(farmAddress);
            const response = await this.getGenericData(
                abi,
                farmAddress,
                'getLockedAssetFactoryManagedAddress',
            );
            return response.firstValue.valueOf().toBech32();
        } catch (error) {
            return undefined;
        }
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
    ): Promise<FarmMigrationConfig> {
        return this.getFarmMigrationConfigurationRaw(farmAddress);
    }

    async getFarmMigrationConfigurationRaw(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        try {
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
            });
        } catch (error) {
            return undefined;
        }
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
}
