import { FarmMigrationConfig } from '../models/farm.model';
import { FarmAbiServiceV1_2 } from '../v1.2/services/farm.v1.2.abi.service';
import { IFarmAbiServiceV1_2 } from '../v1.2/services/interfaces';
import { FarmAbiServiceMock } from './farm.abi.service.mock';
import { farms } from './farm.constants';

export class FarmAbiServiceMockV1_2
    extends FarmAbiServiceMock
    implements IFarmAbiServiceV1_2
{
    lockedAssetFactoryAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async farmingTokenReserve(farmAddress: string): Promise<string> {
        const farm = farms.find((f) => f.address === farmAddress);
        if (farm === undefined) {
            return '0';
        }
        return farm.farmingTokenReserve;
    }
    async undistributedFees(farmAddress: string): Promise<string> {
        return '100';
    }
    async currentBlockFee(farmAddress: string): Promise<string> {
        return '0';
    }
    async lockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return 2;
    }
    farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        throw new Error('Method not implemented.');
    }
}

export const FarmAbiServiceProviderV1_2 = {
    provide: FarmAbiServiceV1_2,
    useClass: FarmAbiServiceMockV1_2,
};
