import { Interaction } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { FarmMigrationConfig } from '../../models/farm.model';
import { AbiFarmService } from '../farm.abi.service';

@Injectable()
export class FarmV13AbiService extends AbiFarmService {
    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

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
