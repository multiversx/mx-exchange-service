import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { FarmTokenAttributesModelV1_2 } from '../models/farmTokenAttributes.model';
import { farms } from './farm.constants';
import { FarmServiceBase } from '../base-module/services/farm.base.service';

export class FarmServiceBaseMock {
    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmingTokenID;
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmedTokenID;
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmTokenID;
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingToken = await this.getFarmingToken(farmAddress);
        return Tokens(farmingToken.identifier);
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        return true;
    }

    async getFarmAddressByFarmTokenID(farmTokenID: string): Promise<string> {
        return farms.find((f) => f.farmTokenID === farmTokenID).address;
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_2 {
        return new FarmTokenAttributesModelV1_2({
            identifier: identifier,
            attributes: attributes,
            originalEnteringEpoch: 1,
            enteringEpoch: 1,
            aprMultiplier: 1,
            lockedRewards: false,
            rewardPerShare: '3000',
            initialFarmingAmount: '100',
            compoundedReward: '10',
            currentFarmAmount: '100',
        });
    }
}

export const FarmServiceProvider = {
    provide: FarmServiceBase,
    useClass: FarmServiceBaseMock,
};
