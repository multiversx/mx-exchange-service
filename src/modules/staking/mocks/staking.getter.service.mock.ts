import { Address } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { StakingGetterService } from '../services/staking.getter.service';

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
        return '10000000000000000000';
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return '10000000000000000000000';
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return '150000000000000000000';
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        return '5256000000000000000';
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<BigNumber> {
        return new BigNumber(1000000000000);
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<BigNumber> {
        return new BigNumber(100);
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return new BigNumber(500000000).toFixed();
    }

    async getProduceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return true;
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return new BigNumber(1000).toFixed();
    }
}

export const StakingGetterServiceProvider = {
    provide: StakingGetterService,
    useClass: StakingGetterServiceMock,
};
