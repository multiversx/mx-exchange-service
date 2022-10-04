import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class StakingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setPairContractManagedAddress(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'pairAddress'),
            value,
            oneHour(),
        );
    }

    async setFarmTokenID(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmingTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmingTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setRewardTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardTokenID'),
            value,
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async setFarmTokenSupply(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenSupply'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setRewardPerShare(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardPerShare'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setAccumulatedRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'accumulatedRewards'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setRewardCapacity(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardCapacity'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setAnnualPercentageRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'annualPercentageRewards'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'minUnboundEpochs'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async setPenaltyPercent(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'penaltyPercent'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async setMinimumFarmingEpoch(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'minimumFarmingEpochs'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'perBlockRewards'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setLastRewardBlockNonce(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'lastRewardBlockNonce'),
            value,
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async setDivisionSafetyConstant(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'divisionSafetyConstant'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'state'),
            value,
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }
}
