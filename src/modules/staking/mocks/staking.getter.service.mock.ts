import { Address } from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';

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

    async computeExtraRewardsSinceLastAllocation(
        stakeAddress: string,
    ): Promise<BigNumber> {
        return new BigNumber(1000000);
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        return '150000';
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return '100000';
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return '150000';
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        return '1000000';
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<BigNumber> {
        return new BigNumber(50000);
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<BigNumber> {
        return new BigNumber(100);
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return new BigNumber(50000).toFixed();
    }

    async getProduceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return true;
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return new BigNumber(15).toFixed();
    }
}
