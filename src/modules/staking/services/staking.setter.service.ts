import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class StakingSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        stakeAddress: string,
        cacheKeyArg: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = this.getStakeCacheKey(stakeAddress, cacheKeyArg);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                StakingSetterService.name,
                '',
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setPairContractManagedAddress(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'pairAddress',
            value,
            oneHour(),
        );
    }

    async setFarmTokenID(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            stakeAddress,
            'farmTokenID',
            value,
            oneHour(),
        );
    }

    async setFarmingTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'farmingTokenID',
            value,
            oneHour(),
        );
    }

    async setRewardTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'rewardTokenID',
            value,
            oneHour(),
        );
    }

    async setFarmTokenSupply(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'farmTokenSupply',
            value,
            oneMinute(),
        );
    }

    async setRewardPerShare(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'rewardPerShare',
            value,
            oneMinute(),
        );
    }

    async setAccumulatedRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'accumulatedRewards',
            value,
            oneMinute(),
        );
    }

    async setRewardCapacity(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'rewardCapacity',
            value,
            oneMinute(),
        );
    }

    async setAnnualPercentageRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'annualPercentageRewards',
            value,
            oneMinute(),
        );
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'minUnboundEpochs',
            value,
            oneMinute(),
        );
    }

    async setPenaltyPercent(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'penaltyPercent',
            value,
            oneMinute(),
        );
    }

    async setMinimumFarmingEpoch(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'minimumFarmingEpochs',
            value,
            oneMinute(),
        );
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'perBlockRewards',
            value,
            oneMinute(),
        );
    }

    async setLastRewardBlockNonce(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'lastRewardBlockNonce',
            value,
            oneMinute(),
        );
    }

    async setDivisionSafetyConstant(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            stakeAddress,
            'divisionSafetyConstant',
            value,
            oneMinute(),
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(stakeAddress, 'state', value, oneMinute());
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }
}
