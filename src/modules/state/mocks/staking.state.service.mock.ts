import { Address } from '@multiversx/sdk-core';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingStateService } from '../services/staking.state.service';

export class StakingStateServiceMock {
    async getAllStakingFarms(): Promise<StakingModel[]> {
        return [
            new StakingModel({
                address: Address.Zero().bech32(),
            }),
        ];
    }
}

export const StakingStateServiceProvider = {
    provide: StakingStateService,
    useClass: StakingStateServiceMock,
};
