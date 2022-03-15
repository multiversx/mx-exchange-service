import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiStakingService } from './staking.abi.service';

@Injectable()
export class StakingGetterService {
    constructor(
        private readonly abiService: AbiStakingService,
        private readonly contextGetterService: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        stakeAddress: string,
        cacheKeyArg: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getStakeCacheKey(stakeAddress, cacheKeyArg);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                StakingGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'pairAddress',
            () => this.abiService.getPairContractManagedAddress(stakeAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'farmTokenID',
            () => this.abiService.getFarmTokenID(stakeAddress),
            oneHour(),
        );
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'farmingTokenID',
            () => this.abiService.getFarmingTokenID(stakeAddress),
            oneHour(),
        );
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'rewardTokenID',
            () => this.abiService.getRewardTokenID(stakeAddress),
            oneHour(),
        );
    }

    async getFarmToken(stakeAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(stakeAddress);
        return await this.contextGetterService.getNftCollectionMetadata(
            farmTokenID,
        );
    }

    async getFarmingToken(stakeAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(stakeAddress);
        return await this.contextGetterService.getTokenMetadata(farmingTokenID);
    }

    async getRewardToken(stakeAddress: string): Promise<EsdtToken> {
        const rewardTokenID = await this.getRewardTokenID(stakeAddress);
        return await this.contextGetterService.getTokenMetadata(rewardTokenID);
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'farmTokenSupply',
            () => this.abiService.getFarmTokenSupply(stakeAddress),
            oneMinute(),
        );
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'rewardPerShare',
            () => this.abiService.getRewardPerShare(stakeAddress),
            oneMinute(),
        );
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'accumulatedRewards',
            () => this.abiService.getAccumulatedRewards(stakeAddress),
            oneMinute(),
        );
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'rewardCapacity',
            () => this.abiService.getRewardCapacity(stakeAddress),
            oneMinute(),
        );
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'annualPercentageRewards',
            () => this.abiService.getAnnualPercentageRewards(stakeAddress),
            oneMinute(),
        );
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        return await this.getData(
            stakeAddress,
            'minUnboundEpochs',
            () => this.abiService.getMinUnbondEpochs(stakeAddress),
            oneMinute(),
        );
    }

    async getPenaltyPercent(stakeAddress: string): Promise<number> {
        return await this.getData(
            stakeAddress,
            'penaltyPercent',
            () => this.abiService.getPenaltyPercent(stakeAddress),
            oneMinute(),
        );
    }

    async getMinimumFarmingEpoch(stakeAddress: string): Promise<number> {
        return await this.getData(
            stakeAddress,
            'minimumFarmingEpochs',
            () => this.abiService.getMinimumFarmingEpoch(stakeAddress),
            oneMinute(),
        );
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'perBlockRewards',
            () => this.abiService.getPerBlockRewardAmount(stakeAddress),
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return await this.getData(
            stakeAddress,
            'lastRewardBlockNonce',
            () => this.abiService.getLastRewardBlockNonce(stakeAddress),
            oneMinute(),
        );
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        return await this.getData(
            stakeAddress,
            'divisionSafetyConstant',
            () => this.abiService.getDivisionSafetyConstant(stakeAddress),
            oneMinute(),
        );
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return this.getData(
            farmAddress,
            'produceRewardsEnabled',
            () => this.abiService.getProduceRewardsEnabled(farmAddress),
            oneMinute() * 2,
        );
    }

    async getState(stakeAddress: string): Promise<string> {
        return await this.getData(
            stakeAddress,
            'state',
            () => this.abiService.getState(stakeAddress),
            oneMinute(),
        );
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }
}
