import { Interaction } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { AbiFarmService } from '../farm.abi.service';

@Injectable()
export class FarmV12AbiService extends AbiFarmService {
    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenReserve();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getUndistributedFees();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getCurrentBlockFee();
        const response = await this.getGenericData(interaction);
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getLockedRewardAprMuliplier();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue();
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

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
