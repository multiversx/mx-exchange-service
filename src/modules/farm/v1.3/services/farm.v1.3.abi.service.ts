import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneHour } from 'src/helpers/helpers';
import { IFarmAbiServiceV1_3 } from './interfaces';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class FarmAbiServiceV1_3
    extends FarmAbiService
    implements IFarmAbiServiceV1_3
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
        protected readonly mxApi: MXApiService,
    ) {
        super(mxProxy, gatewayService, mxApi);
    }

    @ErrorLoggerAsync({
        className: FarmAbiService.name,
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
        return await this.getLockedAssetFactoryAddressRaw(farmAddress);
    }

    async getLockedAssetFactoryAddressRaw(
        farmAddress: string,
    ): Promise<string | undefined> {
        try {
            const contract = await this.mxProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getLockedAssetFactoryManagedAddress();
            const response = await this.getGenericData(interaction);
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            return undefined;
        }
    }

    @ErrorLoggerAsync({
        className: FarmAbiServiceV1_3.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: oneHour(),
    })
    async farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        return await this.getFarmMigrationConfigurationRaw(farmAddress);
    }

    async getFarmMigrationConfigurationRaw(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        try {
            const interaction: Interaction =
                contract.methodsExplicit.getFarmMigrationConfiguration();
            const response = await this.getGenericData(interaction);
            const decodedResponse = response.firstValue.valueOf();

            return new FarmMigrationConfig({
                migrationRole: decodedResponse.migration_role.name,
                oldFarmAddress: decodedResponse.old_farm_address.bech32(),
                oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
            });
        } catch (error) {
            return undefined;
        }
    }
}
