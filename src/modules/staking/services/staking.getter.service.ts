import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { AbiStakingService } from './staking.abi.service';

@Injectable()
export class StakingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiStakingService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'pairAddress'),
            () => this.abiService.getPairContractManagedAddress(stakeAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(stakeAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(stakeAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'rewardTokenID'),
            () => this.abiService.getRewardTokenID(stakeAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async getFarmToken(stakeAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(stakeAddress);
        return await this.tokenGetter.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(stakeAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(stakeAddress);
        return await this.tokenGetter.getTokenMetadata(farmingTokenID);
    }

    async getRewardToken(stakeAddress: string): Promise<EsdtToken> {
        const rewardTokenID = await this.getRewardTokenID(stakeAddress);
        return await this.tokenGetter.getTokenMetadata(rewardTokenID);
    }

    async getFarmTokenSupply(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'accumulatedRewards'),
            () => this.abiService.getAccumulatedRewards(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'rewardCapacity'),
            () => this.abiService.getRewardCapacity(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'annualPercentageRewards'),
            () => this.abiService.getAnnualPercentageRewards(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'minUnboundEpochs'),
            () => this.abiService.getMinUnbondEpochs(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async getPenaltyPercent(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'penaltyPercent'),
            () => this.abiService.getPenaltyPercent(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async getMinimumFarmingEpoch(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'minimumFarmingEpochs'),
            () => this.abiService.getMinimumFarmingEpoch(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'perBlockRewards'),
            () => this.abiService.getPerBlockRewardAmount(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'lastRewardBlockNonce'),
            () => this.abiService.getLastRewardBlockNonce(stakeAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'divisionSafetyConstant'),
            () => this.abiService.getDivisionSafetyConstant(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    async getProduceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return this.getData(
            this.getStakeCacheKey(stakeAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(stakeAddress),
            oneMinute() * 2,
        );
    }

    async getBurnGasLimit(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'burnGasLimit'),
            () => this.abiService.getBurnGasLimit(stakeAddress),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(stakeAddress),
            oneHour(),
        );
    }

    async getState(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'state'),
            () => this.abiService.getState(stakeAddress),
            oneMinute() * 5,
            oneMinute() * 3,
        );
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(
                stakeAddress,
                'lockedAssetFactoryManagedAddress',
            ),
            () =>
                this.abiService.getLockedAssetFactoryManagedAddress(
                    stakeAddress,
                ),
            oneHour(),
        );
    }

    async getLastErrorMessage(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeCacheKey(stakeAddress, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(stakeAddress),
            oneMinute(),
        );
    }
}
