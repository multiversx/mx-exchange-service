import BigNumber from 'bignumber.js';
import { IStakingAbiService } from '../services/interfaces';
import { StakingAbiService } from '../services/staking.abi.service';
import { Address } from '@multiversx/sdk-core/out';

export class StakingAbiServiceMock implements IStakingAbiService {
    async pairContractAddress(): Promise<string> {
        return Address.Zero().bech32();
    }
    async farmTokenID(): Promise<string> {
        return 'STAKETOK-1111';
    }
    async farmingTokenID(): Promise<string> {
        return 'WEGLD-123456';
    }
    async rewardTokenID(): Promise<string> {
        return 'WEGLD-123456';
    }
    async farmTokenSupply(): Promise<string> {
        return '5256000000000000000';
    }
    async rewardPerShare(): Promise<string> {
        return '150000000000000000000';
    }
    async accumulatedRewards(): Promise<string> {
        return '10000000000000000000';
    }
    async rewardCapacity(): Promise<string> {
        return '10000000000000000000000';
    }
    async annualPercentageRewards(): Promise<string> {
        return new BigNumber(1000).toFixed();
    }
    minUnbondEpochs(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async perBlockRewardsAmount(): Promise<string> {
        return new BigNumber(500000000).toFixed();
    }
    async lastRewardBlockNonce(): Promise<number> {
        return new BigNumber(100).toNumber();
    }
    async divisionSafetyConstant(): Promise<number> {
        return new BigNumber(1000000000000).toNumber();
    }
    async produceRewardsEnabled(): Promise<boolean> {
        return true;
    }
    burnGasLimit(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    transferExecGasLimit(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    state(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    calculateRewardsForGivenPosition(): Promise<BigNumber> {
        throw new Error('Method not implemented.');
    }
    lockedAssetFactoryAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    isWhitelisted(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    lastErrorMessage(): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export const StakingAbiServiceProvider = {
    provide: StakingAbiService,
    useClass: StakingAbiServiceMock,
};
