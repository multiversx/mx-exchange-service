import { Address } from '@multiversx/sdk-core/out';
import { IStakingProxyAbiService } from '../services/interfaces';
import { StakingProxyAbiService } from '../services/staking.proxy.abi.service';

export class StakingProxyAbiServiceMock implements IStakingProxyAbiService {
    async lpFarmAddress(): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingFarmAddress(): Promise<string> {
        return Address.Zero().bech32();
    }
    async pairAddress(): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingTokenID(): Promise<string> {
        return 'WEGLD-123456';
    }
    async farmTokenID(): Promise<string> {
        return 'STAKETOK-1111';
    }
    async dualYieldTokenID(): Promise<string> {
        return 'METASTAKE-1234';
    }
    async lpFarmTokenID(): Promise<string> {
        return 'EGLDTOK4FL-abcdef';
    }
}

export const StakingProxyAbiServiceProvider = {
    provide: StakingProxyAbiService,
    useClass: StakingProxyAbiServiceMock,
};
