import { Address } from '@elrondnetwork/erdjs/out';

export class StakingGetterServiceMock {
    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        return 'STAKETOK-1111';
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        return 'TOK1-1111';
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        return 'TOK1-1111';
    }
}
