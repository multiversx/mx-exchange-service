import { Address } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { StakingStateService } from '../services/staking.state.service';

export class StakingStateServiceMock {
    async getAllStakingFarms(): Promise<StakingModel[]> {
        return [
            new StakingModel({
                address: Address.Zero().bech32(),
                farmingTokenId: 'WEGLD-123456',
                farmTokenCollection: 'STAKETOK-111111',
                rewardTokenId: 'rewardTokenID',
                farmTokenSupply: '5256000000000000000',
                divisionSafetyConstant: '1000000000000',
                rewardPerShare: '150000000000000000000',
                accumulatedRewards: '10000000000000000000',
                rewardCapacity: '10000000000000000000000',
                lastRewardBlockNonce: 100,
                perBlockRewards: new BigNumber(500000000).toFixed(),
                produceRewardsEnabled: true,
                rewardsPerBlockAPRBound: '100000000000',
                time: new WeekTimekeepingModel({
                    currentWeek: 250,
                    firstWeekStartEpoch: 250,
                }),
            }),
        ];
    }

    async getStakingFarms(addresses: string[]): Promise<StakingModel[]> {
        return [
            new StakingModel({
                address: Address.Zero().bech32(),
                farmingTokenId: 'WEGLD-123456',
                farmTokenCollection: 'STAKETOK-111111',
                rewardTokenId: 'rewardTokenID',
                farmTokenSupply: '5256000000000000000',
                divisionSafetyConstant: '1000000000000',
                rewardPerShare: '150000000000000000000',
                accumulatedRewards: '10000000000000000000',
                rewardCapacity: '10000000000000000000000',
                lastRewardBlockNonce: 100,
                perBlockRewards: new BigNumber(500000000).toFixed(),
                produceRewardsEnabled: true,
                rewardsPerBlockAPRBound: '100000000000',
                time: new WeekTimekeepingModel({
                    currentWeek: 250,
                    firstWeekStartEpoch: 250,
                }),
            }),
        ];
    }
}

export const StakingStateServiceProvider = {
    provide: StakingStateService,
    useClass: StakingStateServiceMock,
};
