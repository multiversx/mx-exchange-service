import { forwardRef, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { AbiFarmService } from './farm.abi.service';
import { FarmComputeService } from './farm.compute.service';

export abstract class FarmGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmComputeService))
        protected readonly computeService: FarmComputeService,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'farm';
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmedTokenID'),
            () => this.abiService.getFarmedTokenID(farmAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(farmAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(farmAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getFarmedToken(farmAddress: string): Promise<EsdtToken> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return this.tokenGetter.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.tokenGetter.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return this.tokenGetter.getTokenMetadata(farmingTokenID);
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return this.getData(
            this.getCacheKey(farmAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'rewardsPerBlock'),
            () => this.abiService.getRewardsPerBlock(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(farmAddress, 'penaltyPercent'),
            () => this.abiService.getPenaltyPercent(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(farmAddress, 'minimumFarmingEpochs'),
            () => this.abiService.getMinimumFarmingEpochs(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getState(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'state'),
            () => this.abiService.getState(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'rewardReserve'),
            () => this.abiService.getRewardReserve(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lastRewardBlocknonce'),
            () => this.abiService.getLastRewardBlockNonce(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'divisionSafetyConstant'),
            () => this.abiService.getDivisionSafetyConstant(farmAddress),
            oneHour(),
        );
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmedTokenPriceUSD'),
            () => this.computeService.computeFarmedTokenPriceUSD(farmAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getFarmingTokenPriceUSD(farmAddress);
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmingTokenPriceUSD'),
            () => this.computeService.computeFarmingTokenPriceUSD(farmAddress),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getTotalValueLockedUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'totalValueLockedUSD'),
            () => this.computeService.computeFarmLockedValueUSD(farmAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getBurnGasLimit(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddresses, 'burnGasLimit'),
            () => this.abiService.getBurnGasLimit(farmAddresses),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddresses, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(farmAddresses),
            oneHour(),
        );
    }

    async getPairContractManagedAddress(
        farmAddresses: string,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddresses, 'pairContractManagedAddress'),
            () => this.abiService.getPairContractManagedAddress(farmAddresses),
            oneHour(),
        );
    }

    async getLockedAssetFactoryManagedAddress(
        farmAddresses: string,
    ): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddresses, 'lockedAssetFactoryManagedAddress'),
            () =>
                this.abiService.getLockedAssetFactoryManagedAddress(
                    farmAddresses,
                ),
            oneHour(),
        );
    }

    async getOwnerAddress(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'ownerAddress'),
            async () => {
                return (await this.apiService.getAccountStats(farmAddress))
                    .ownerAddress;
            },
            oneHour(),
        );
    }

    async getLastErrorMessage(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddresses, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(farmAddresses),
            oneMinute(),
        );
    }
}
