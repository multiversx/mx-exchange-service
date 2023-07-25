import { Address } from '@multiversx/sdk-core';

export class StakingProxyGetterServiceMock {
    async getLpFarmAddress(): Promise<string> {
        return Address.Zero().bech32();
    }

    async getStakingFarmAddress(): Promise<string> {
        return Address.Zero().bech32();
    }

    async getPairAddress(): Promise<string> {
        return Address.Zero().bech32();
    }

    async getStakingTokenID(): Promise<string> {
        return 'WEGLD-123456';
    }

    async getFarmTokenID(): Promise<string> {
        return 'STAKETOK-1111';
    }

    async getDualYieldTokenID(): Promise<string> {
        return 'METASTAKE-1234';
    }

    async getLpFarmTokenID(): Promise<string> {
        return 'EGLDTOK4FL-abcdef';
    }
}
