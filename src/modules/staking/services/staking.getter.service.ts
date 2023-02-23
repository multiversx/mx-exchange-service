import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { AbiStakingService } from './staking.abi.service';
import { StakingComputeService } from './staking.compute.service';

@Injectable()
export class StakingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiStakingService,
        @Inject(forwardRef(() => StakingComputeService))
        private readonly computeService: StakingComputeService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'stake';
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
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getFarmingTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(stakeAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getRewardTokenID(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardTokenID'),
            () => this.abiService.getRewardTokenID(stakeAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getRewardPerShare(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(stakeAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getAccumulatedRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'accumulatedRewards'),
            () => this.abiService.getAccumulatedRewards(stakeAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getRewardCapacity(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'rewardCapacity'),
            () => this.abiService.getRewardCapacity(stakeAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getAnnualPercentageRewards(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'annualPercentageRewards'),
            () => this.abiService.getAnnualPercentageRewards(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getStakeFarmAPR(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'apr'),
            () => this.computeService.computeStakeFarmAPR(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getMinUnbondEpochs(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'minUnboundEpochs'),
            () => this.abiService.getMinUnbondEpochs(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPerBlockRewardAmount(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'perBlockRewards'),
            () => this.abiService.getPerBlockRewardAmount(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLastRewardBlockNonce(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'lastRewardBlockNonce'),
            () => this.abiService.getLastRewardBlockNonce(stakeAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getDivisionSafetyConstant(stakeAddress: string): Promise<number> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'divisionSafetyConstant'),
            () => this.abiService.getDivisionSafetyConstant(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getProduceRewardsEnabled(stakeAddress: string): Promise<boolean> {
        return this.getData(
            this.getCacheKey(stakeAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(stakeAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockedAssetFactoryManagedAddress(
        stakeAddress: string,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'lockedAssetFactoryManagedAddress'),
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

    async getStakedValueUSD(stakeAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(stakeAddress, 'stakedValueUSD'),
            () => this.computeService.computeStakedValueUSD(stakeAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
