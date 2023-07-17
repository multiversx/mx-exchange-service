import { StakingProxyService } from '../services/staking.proxy.service';

export class StakingProxyServiceMock {}

export const StakingProxyServiceProvider = {
    provide: StakingProxyService,
    useClass: StakingProxyServiceMock,
};
