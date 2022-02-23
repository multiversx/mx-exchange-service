import { Address } from '@elrondnetwork/erdjs/out';

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
        return 'TOK1-1111';
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'STAKETOK-1111';
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return 'METASTAKE-1234';
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'FMT-1234';
    }
}
