import { Address } from '@multiversx/sdk-core';

export class StakingProxyGetterServiceMock {
    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        return 'WEGLD-123456';
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'STAKETOK-1111';
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return 'METASTAKE-123456';
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'EGLDTOK4FL-abcdef';
    }
}
