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

    async getWhitelist(farmAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'whitelist'),
            () => this.abiService.getWhitelist(farmAddress),
            oneHour(),
        );
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmTokenSupply'),
            () => this.abiService.getFarmTokenSupply(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmingTokenReserve'),
            () => this.abiService.getFarmingTokenReserve(farmAddress),
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

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'undistributedFees'),
            () => this.abiService.getUndistributedFees(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'currentBlockFee'),
            () => this.abiService.getCurrentBlockFee(farmAddress),
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

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(farmAddress, 'aprMultiplier'),
            () => this.abiService.getLockedRewardAprMuliplier(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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

    async getLockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedFarmingTokenReserve'),
            () =>
                this.computeService.computeLockedFarmingTokenReserve(
                    farmAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getUnlockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedFarmingTokenReserve'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserve(
                    farmAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
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

    async getLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeLockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getUnlockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedRewardsAPR'),
            () => this.computeService.computeUnlockedRewardsAPR(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedRewardsAPR'),
            () => this.computeService.computeLockedRewardsAPR(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getFarmAPR(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'farmAPR'),
            () => this.computeService.computeFarmAPR(farmAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        return this.getData(
            this.getCacheKey(farmAddress, 'migrationConfig'),
            () => this.abiService.getFarmMigrationConfiguration(farmAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            this.getCacheKey(
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
            this.getCacheKey(farmAddresses, 'lastErrorMessage'),
            () => this.abiService.getLastErrorMessage(farmAddresses),
            oneMinute(),
        );
    }
}
