import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
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
        super(cachingService, logger, 'stake');
    }

    async getPairContractManagedAddress(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'pairAddress'),
            () => this.abiService.getPairContractManagedAddress(stakeAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(stakeAddress),
            oneHour(),
        );
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(stakeAddress),
            oneHour(),
        );
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardTokenID'),
            () => this.abiService.getRewardTokenID(stakeAddress),
            oneHour(),
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
            this.getCacheKey(stakeAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(stakeAddress),
            oneMinute(),
        );
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(stakeAddress),
            oneMinute(),
        );
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'accumulatedRewards'),
            () => this.abiService.getAccumulatedRewards(stakeAddress),
            oneMinute(),
        );
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardCapacity'),
            () => this.abiService.getRewardCapacity(stakeAddress),
            oneMinute(),
        );
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'annualPercentageRewards'),
            () => this.abiService.getAnnualPercentageRewards(stakeAddress),
            oneMinute(),
        );
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'minUnboundEpochs'),
            () => this.abiService.getMinUnbondEpochs(stakeAddress),
            oneMinute(),
        );
    }

    async getPenaltyPercent(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'penaltyPercent'),
            () => this.abiService.getPenaltyPercent(stakeAddress),
            oneMinute(),
        );
    }

    async getMinimumFarmingEpoch(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'minimumFarmingEpochs'),
            () => this.abiService.getMinimumFarmingEpoch(stakeAddress),
            oneMinute(),
        );
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'perBlockRewards'),
            () => this.abiService.getPerBlockRewardAmount(stakeAddress),
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'lastRewardBlockNonce'),
            () => this.abiService.getLastRewardBlockNonce(stakeAddress),
            oneMinute(),
        );
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'divisionSafetyConstant'),
            () => this.abiService.getDivisionSafetyConstant(stakeAddress),
            oneMinute(),
        );
    }

    async getProduceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return this.getData(
            this.getCacheKey(stakeAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(stakeAddress),
            oneMinute() * 2,
        );
    }

    async getBurnGasLimit(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'burnGasLimit'),
            () => this.abiService.getBurnGasLimit(stakeAddress),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(stakeAddress),
            oneHour(),
        );
    }

    async getState(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'state'),
            () => this.abiService.getState(stakeAddress),
            oneMinute(),
        );
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(
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
            this.getCacheKey(stakeAddress, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(stakeAddress),
            oneMinute(),
        );
    }
}
