/* eslint-disable @typescript-eslint/no-unused-vars */
import { FarmGetterServiceV1_2 } from '../v1.2/services/farm.v1.2.getter.service';
import { farms } from './farm.constants';
import { FarmGetterServiceMock } from './farm.getter.service.mock';

export class FarmGetterServiceMockV1_2 extends FarmGetterServiceMock {
    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const farm = farms.find((f) => f.address === farmAddress);
        if (farm === undefined) {
            return '0';
        }
        return farm.farmingTokenReserve;
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return 2;
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return '100';
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return '0';
    }
}

export const FarmGetterServiceProviderV1_2 = {
    provide: FarmGetterServiceV1_2,
    useClass: FarmGetterServiceMockV1_2,
};
