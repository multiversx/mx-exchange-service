import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextService } from 'src/services/context/context.service';
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
        private readonly context: ContextService,
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
            return this.cachingService.getOrSet(cacheKey, createValueFunc, ttl);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmGetterService.name,
                createValueFunc.name,
                cacheKey,
                error,
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
        return this.context.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.context.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return this.context.getTokenMetadata(farmingTokenID);
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

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
