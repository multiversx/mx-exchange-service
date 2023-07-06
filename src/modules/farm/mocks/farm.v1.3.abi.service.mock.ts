import { FarmMigrationConfig } from '../models/farm.model';
import { FarmAbiServiceV1_3 } from '../v1.3/services/farm.v1.3.abi.service';
import { IFarmAbiServiceV1_3 } from '../v1.3/services/interfaces';
import { FarmAbiServiceMock } from './farm.abi.service.mock';

export class FarmAbiServiceMockV1_3
    extends FarmAbiServiceMock
    implements IFarmAbiServiceV1_3
{
    lockedAssetFactoryAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        throw new Error('Method not implemented.');
    }
}

export const FarmAbiServiceProviderV1_3 = {
    provide: FarmAbiServiceV1_3,
    useClass: FarmAbiServiceMockV1_3,
};
