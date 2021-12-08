import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiFarmService } from './abi-farm.service';
import { FarmComputeService } from './farm.compute.service';

@Injectable()
export class FarmGetterService {
    constructor(
        private readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmComputeService))
        private readonly computeService: FarmComputeService,
        private readonly cachingService: CachingService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        farmAddress: string,
        tokenCacheKey: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getFarmCacheKey(farmAddress, tokenCacheKey);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmedTokenID',
            () => this.abiService.getFarmedTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmTokenID',
            () => this.abiService.getFarmTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmingTokenID',
            () => this.abiService.getFarmingTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmedToken(farmAddress: string): Promise<EsdtToken> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return this.contextGetter.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.contextGetter.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return this.contextGetter.getTokenMetadata(farmingTokenID);
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmTokenSupply',
            () => this.abiService.getFarmTokenSupply(farmAddress),
            oneMinute(),
        );
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmingTokenReserve',
            () => this.abiService.getFarmingTokenReserve(farmAddress),
            oneMinute(),
        );
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'rewardsPerBlock',
            () => this.abiService.getRewardsPerBlock(farmAddress),
            oneHour(),
        );
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return this.getData(
            farmAddress,
            'penaltyPercent',
            () => this.abiService.getPenaltyPercent(farmAddress),
            oneHour(),
        );
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return this.getData(
            farmAddress,
            'minimumFarmingEpochs',
            () => this.abiService.getMinimumFarmingEpochs(farmAddress),
            oneHour(),
        );
    }

    async getState(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'state',
            () => this.abiService.getState(farmAddress),
            oneHour(),
        );
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'rewardPerShare',
            () => this.abiService.getRewardPerShare(farmAddress),
            oneMinute(),
        );
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<number> {
        return this.getData(
            farmAddress,
            'lastRewardBlocknonce',
            () => this.abiService.getLastRewardBlockNonce(farmAddress),
            oneMinute(),
        );
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'undistributedFees',
            () => this.abiService.getUndistributedFees(farmAddress),
            oneMinute(),
        );
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'currentBlockFee',
            () => this.abiService.getCurrentBlockFee(farmAddress),
            oneMinute(),
        );
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'divisionSafetyConstant',
            () => this.abiService.getDivisionSafetyConstant(farmAddress),
            oneHour(),
        );
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return this.getData(
            farmAddress,
            'aprMultiplier',
            () => this.abiService.getLockedRewardAprMuliplier(farmAddress),
            oneMinute(),
        );
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmedTokenPriceUSD',
            () => this.computeService.computeFarmedTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getFarmingTokenPriceUSD(farmAddress);
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'farmingTokenPriceUSD',
            () => this.computeService.computeFarmingTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async getLockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'lockedFarmingTokenReserve',
            () =>
                this.computeService.computeLockedFarmingTokenReserve(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'unlockedFarmingTokenReserve',
            () =>
                this.computeService.computeUnlockedFarmingTokenReserve(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getTotalValueLockedUSD(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'totalValueLockedUSD',
            () => this.computeService.computeFarmLockedValueUSD(farmAddress),
            oneMinute(),
        );
    }

    async getLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            farmAddress,
            'lockedFarmingTokenReserveUSD',
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
            farmAddress,
            'unlockedFarmingTokenReserveUSD',
            () =>
                this.computeService.computeUnlockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'unlockedRewardsAPR',
            () => this.computeService.computeUnlockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getLockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            farmAddress,
            'lockedRewardsAPR',
            () => this.computeService.computeLockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getBurnedTokenAmount(
        farmAddress: string,
        tokenID: string,
    ): Promise<string> {
        return this.getData(
            farmAddress,
            `${tokenID}.burnedTokenAmount`,
            () => this.abiService.getBurnedTokenAmount(farmAddress, tokenID),
            oneMinute(),
        );
    }

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
