/* eslint-disable @typescript-eslint/no-unused-vars */
import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { FarmAbiService } from '../base-module/services/farm.abi.service';
import { IFarmAbiService } from '../base-module/services/interfaces';
import { farms } from './farm.constants';

export class FarmAbiServiceMock implements IFarmAbiService {
    async farmedTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmedTokenID;
    }
    async farmTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmTokenID;
    }
    async farmingTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmingTokenID;
    }
    async farmTokenSupply(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmTotalSupply;
    }
    async rewardsPerBlock(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).rewardsPerBlock;
    }
    async penaltyPercent(farmAddress: string): Promise<number> {
        return 10;
    }
    async minimumFarmingEpochs(farmAddress: string): Promise<number> {
        return 3;
    }
    async rewardPerShare(farmAddress: string): Promise<string> {
        return '100';
    }
    rewardReserve(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async lastRewardBlockNonce(farmAddress: string): Promise<number> {
        return 1;
    }
    async divisionSafetyConstant(farmAddress: string): Promise<string> {
        return '1000000';
    }
    async state(farmAddress: string): Promise<string> {
        return 'true';
    }
    async produceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return true;
    }
    burnGasLimit(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    transferExecGasLimit(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async pairContractAddress(farmAddress: string): Promise<string> {
        return 'erd1a42xw92g8n78v6y4p3qj9ed2gjmr20kd9h2pkhuuuxf5tgn44q3sxy8unx';
    }
    lastErrorMessage(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    ownerAddress(farmAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return 10;
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return 3;
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        return new BigNumber('1000000000000000000');
    }
}

export const FarmAbiServiceProvider = {
    provide: FarmAbiService,
    useClass: FarmAbiServiceMock,
};
