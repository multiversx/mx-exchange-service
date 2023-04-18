import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { AbiFarmService } from '../../base-module/services/farm.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';

@Injectable()
export class FarmAbiServiceV1_2 extends AbiFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly gatewayService: MXGatewayService,
    ) {
        super(mxProxy, gatewayService);
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenReserve();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getUndistributedFees();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getCurrentBlockFee();
        const response = await this.getGenericData(interaction);
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getLockedRewardAprMuliplier();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue();
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getFarmMigrationConfiguration();
        const response = await this.getGenericData(interaction);
        const decodedResponse = response.firstValue.valueOf();

        return new FarmMigrationConfig({
            migrationRole: decodedResponse.migration_role.name,
            oldFarmAddress: decodedResponse.old_farm_address.bech32(),
            oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
            newFarmAddress: decodedResponse.new_farm_address.bech32(),
            newLockedFarmAddress:
                decodedResponse.new_farm_with_lock_address.bech32(),
        });
    }
}
