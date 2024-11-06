/* eslint-disable @typescript-eslint/no-unused-vars */
import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { FarmAbiService } from '../base-module/services/farm.abi.service';
import { IFarmAbiService } from '../base-module/services/interfaces';
import { farms } from './farm.constants';
import { Address } from '@multiversx/sdk-core/out';

export class FarmAbiServiceMock implements IFarmAbiService {
    async farmedTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmedTokenID;
    }
    async farmTokenID(farmAddress: string): Promise<string> {
        return farms.find((f) => f.address === farmAddress).farmTokenID;
    }
    async getAllFarmTokenIds(farmsAddresses: string[]): Promise<string[]> {
        return farms
            .filter((farm) => farmsAddresses.includes(farm.address))
            .map((farm) => farm.farmTokenID);
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
        return farms.find((f) => f.address === farmAddress).rewardPerShare;
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
        return Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000012',
        ).bech32();
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

    async farmShard(farmAddress: string): Promise<number> {
        return 1;
    }
}

export const FarmAbiServiceProvider = {
    provide: FarmAbiService,
    useClass: FarmAbiServiceMock,
};
