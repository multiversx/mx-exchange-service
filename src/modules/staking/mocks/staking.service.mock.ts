import { StakingService } from '../services/staking.service';

export class StakingServiceMock {}

export const StakingServiceProvider = {
    provide: StakingService,
    useClass: StakingServiceMock,
};
