/* eslint-disable @typescript-eslint/no-unused-vars */
import { farms } from 'src/modules/farm/mocks/farm.constants';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmsStateService } from '../services/farms.state.service';

export class FarmsStateServiceMock {
    async getFarms(
        addresses: string[] = [],
        fields: (keyof FarmModelV2)[] = [],
    ): Promise<FarmModelV2[]> {
        const farmAddressesV2 = farmsAddresses(['v2']);

        const result: FarmModelV2[] = [];

        addresses.forEach((address) => {
            if (farmAddressesV2.includes(address)) {
                const farm = farms.find((f) => f.address === address);
                result.push(
                    new FarmModelV2({
                        address: farm.address,
                        farmedTokenId: farm.farmedTokenID,
                        farmTokenCollection: farm.farmTokenID,
                        farmingTokenId: farm.farmingTokenID,
                        farmTokenSupply: farm.farmTotalSupply,
                        perBlockRewards: farm.rewardsPerBlock,
                        rewardPerShare: farm.rewardPerShare,
                        rewardType: FarmRewardType.LOCKED_REWARDS,
                        version: FarmVersion.V2,
                    }),
                );
            }
        });
        return result;
    }
}

export const FarmsStateServiceProvider = {
    provide: FarmsStateService,
    useClass: FarmsStateServiceMock,
};
