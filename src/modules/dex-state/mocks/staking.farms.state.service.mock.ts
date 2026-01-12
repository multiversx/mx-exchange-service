import { StakingFarmsStateService } from '../services/staking.farms.state.service';

export class StakingFarmsStateServiceMock {}

export const StakingFarmsStateServiceProvider = {
    provide: StakingFarmsStateService,
    useClass: StakingFarmsStateServiceMock,
};
