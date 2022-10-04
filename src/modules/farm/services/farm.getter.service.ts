import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenTtl } from 'src/helpers/cachingTTLs';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { FarmMigrationConfig } from '../models/farm.model';
import { AbiFarmService } from './abi-farm.service';
import { FarmComputeService } from './farm.compute.service';

@Injectable()
export class FarmGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmComputeService))
        private readonly computeService: FarmComputeService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmedTokenID'),
            () => this.abiService.getFarmedTokenID(farmAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(farmAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenID'),
            () => this.abiService.getFarmingTokenID(farmAddress),
            TokenTtl.remoteTtl,
            TokenTtl.localTtl,
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

    async getWhitelist(farmAddress: string): Promise<string[]> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'whitelist'),
            () => this.abiService.getWhitelist(farmAddress),
            oneHour(),
        );
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'farmingTokenReserve'),
            () => this.abiService.getFarmingTokenReserve(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'produceRewardsEnabled'),
            () => this.abiService.getProduceRewardsEnabled(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
        );
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardsPerBlock'),
            () => this.abiService.getRewardsPerBlock(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
        );
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'penaltyPercent'),
            () => this.abiService.getPenaltyPercent(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
        );
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'minimumFarmingEpochs'),
            () => this.abiService.getMinimumFarmingEpochs(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
        );
    }

    async getState(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'state'),
            () => this.abiService.getState(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
        );
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardPerShare'),
            () => this.abiService.getRewardPerShare(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'rewardReserve'),
            () => this.abiService.getRewardReserve(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'lastRewardBlocknonce'),
            () => this.abiService.getLastRewardBlockNonce(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'undistributedFees'),
            () => this.abiService.getUndistributedFees(farmAddress),
            oneMinute() * 3,
            oneMinute(),
        );
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'currentBlockFee'),
            () => this.abiService.getCurrentBlockFee(farmAddress),
            oneMinute() * 3,
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

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'aprMultiplier'),
            () => this.abiService.getLockedRewardAprMuliplier(farmAddress),
            oneMinute() * 10,
            oneMinute() * 3,
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

    async getLockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'lockedFarmingTokenReserve'),
            () =>
                this.computeService.computeLockedFarmingTokenReserve(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'unlockedFarmingTokenReserve'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserve(
                    farmAddress,
                ),
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

    async getLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'lockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeLockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'unlockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'unlockedRewardsAPR'),
            () => this.computeService.computeUnlockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getLockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'lockedRewardsAPR'),
            () => this.computeService.computeLockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getFarmAPR(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'farmAPR'),
            () => this.computeService.computeFarmAPR(farmAddress),
            oneMinute(),
        );
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        return this.getData(
            this.getFarmCacheKey(farmAddress, 'migrationConfig'),
            () => this.abiService.getFarmMigrationConfiguration(farmAddress),
            oneSecond(),
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

    async getLastErrorMessage(farmAddresses: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddresses, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(farmAddresses),
            oneMinute(),
        );
    }

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
