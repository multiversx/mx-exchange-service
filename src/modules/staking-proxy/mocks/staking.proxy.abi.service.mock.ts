import { Address } from '@multiversx/sdk-core/out';
import { IStakingProxyAbiService } from '../services/interfaces';
import { StakingProxyAbiService } from '../services/staking.proxy.abi.service';

export class StakingProxyAbiServiceMock implements IStakingProxyAbiService {
    async lpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async pairAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingTokenID(stakingProxyAddress: string): Promise<string> {
        return 'WEGLD-123456';
    }
    async farmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'STAKETOK-1111';
    }
    async dualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return 'METASTAKE-123456';
    }
    async lpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'EGLDTOK4FL-abcdef';
    }
}

export const StakingProxyAbiServiceProvider = {
    provide: StakingProxyAbiService,
    useClass: StakingProxyAbiServiceMock,
};
