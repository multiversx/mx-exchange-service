import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { AbiFarmService } from './farm.abi.service';
import { FarmComputeService } from './farm.compute.service';

@Injectable()
export class FarmGetterService extends GenericGetterService {
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
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmedTokenID'),
            () => this.abiService.getFarmedTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(farmAddress),
            oneHour(),
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
            this.getFarmCacheKey(farmAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(farmAddress),
            oneMinute(),
        );
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(farmAddress),
            oneMinute() * 2,
        );
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardsPerBlock'),
            () => this.abiService.getRewardsPerBlock(farmAddress),
            oneMinute() * 2,
        );
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'penaltyPercent'),
            () => this.abiService.getPenaltyPercent(farmAddress),
            oneMinute(),
        );
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'minimumFarmingEpochs'),
            () => this.abiService.getMinimumFarmingEpochs(farmAddress),
            oneHour(),
        );
    }

    async getState(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'state'),
            () => this.abiService.getState(farmAddress),
            oneMinute(),
        );
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(farmAddress),
            oneMinute(),
        );
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardReserve'),
            () => this.abiService.getRewardReserve(farmAddress),
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'lastRewardBlocknonce'),
            () => this.abiService.getLastRewardBlockNonce(farmAddress),
            oneMinute(),
        );
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'divisionSafetyConstant'),
            () => this.abiService.getDivisionSafetyConstant(farmAddress),
            oneHour(),
        );
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmedTokenPriceUSD'),
            () => this.computeService.computeFarmedTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getFarmingTokenPriceUSD(farmAddress);
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenPriceUSD'),
            () => this.computeService.computeFarmingTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async getTotalValueLockedUSD(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'totalValueLockedUSD'),
            () => this.computeService.computeFarmLockedValueUSD(farmAddress),
            oneMinute(),
        );
    }

    async getBurnGasLimit(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddresses, 'burnGasLimit'),
            () => this.abiService.getBurnGasLimit(farmAddresses),
            oneHour(),
        );
    }

    async getTransferExecGasLimit(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddresses, 'transferExecGasLimit'),
            () => this.abiService.getTransferExecGasLimit(farmAddresses),
            oneHour(),
        );
    }

    async getPairContractManagedAddress(
        farmAddresses: string,
    ): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddresses, 'pairContractManagedAddress'),
            () => this.abiService.getPairContractManagedAddress(farmAddresses),
            oneHour(),
        );
    }

    async getLockedAssetFactoryManagedAddress(
        farmAddresses: string,
    ): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(
                farmAddresses,
                'lockedAssetFactoryManagedAddress',
            ),
            () =>
                this.abiService.getLockedAssetFactoryManagedAddress(
                    farmAddresses,
                ),
            oneHour(),
        );
    }

    async getOwnerAddress(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'ownerAddress'),
            async () => {
                return (await this.apiService.getAccountStats(farmAddress))
                    .ownerAddress;
            },
            oneHour(),
        );
    }

    async getLastErrorMessage(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddresses, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(farmAddresses),
            oneMinute(),
        );
    }

    protected getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
