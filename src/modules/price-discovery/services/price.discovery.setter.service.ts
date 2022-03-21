import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';

export class PriceDiscoverySetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        priceDiscoveryAddress: string,
        key: string,
        value: any,
        ttl: number,
    ): Promise<string> {
        const cacheKey = this.getPriceDiscoveryCacheKey(
            priceDiscoveryAddress,
            key,
        );
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PriceDiscoverySetterService.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLaunchedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenID',
            value,
            oneHour(),
        );
    }

    async setAcceptedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenID',
            value,
            oneHour(),
        );
    }

    async setRewardsTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'rewardsTokenID',
            value,
            oneHour(),
        );
    }

    async setRedeemTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'redeemTokenID',
            value,
            oneHour(),
        );
    }

    async setLpTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'lpTokenID',
            value,
            oneHour(),
        );
    }

    async setExtraRewardsTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'extraRewardsTokenID',
            value,
            oneHour(),
        );
    }

    async setLaunchedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenAmount',
            value,
            oneSecond() * 6,
        );
    }

    async setAcceptedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenAmount',
            value,
            oneSecond() * 6,
        );
    }

    async setLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenPrice',
            value,
            oneSecond() * 6,
        );
    }

    async setAcceptedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenPrice',
            value,
            oneSecond() * 6,
        );
    }

    async setLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenPriceUSD',
            value,
            oneSecond() * 6,
        );
    }

    async setAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenPriceUSD',
            value,
            oneSecond() * 6,
        );
    }

    async setLpTokensReceived(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'lpTokensReceived',
            value,
            oneMinute(),
        );
    }

    async setExtraRewards(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'extraRewards',
            value,
            oneMinute(),
        );
    }

    async setStartBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'startEpoch',
            value,
            oneHour(),
        );
    }

    async setEndBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'endEpoch',
            value,
            oneHour(),
        );
    }

    async setPairAddress(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'pairAddress',
            value,
            oneHour(),
        );
    }

    async setCurrentPhase(
        priceDiscoveryAddress: string,
        value: PhaseModel,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'currentPhase',
            value,
            oneMinute(),
        );
    }

    async setMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'minLaunchedTokenPrice',
            value,
            oneHour(),
        );
    }

    async setNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'noLimitPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'linearPenaltyPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'fixedPenaltyPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setUnbondPeriodEpochs(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'unbondPeriodEpochs',
            value,
            oneHour(),
        );
    }

    async setPenaltyMinPercentage(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'penaltyMinPercentage',
            value,
            oneHour(),
        );
    }

    async setPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'penaltyMaxPercentage',
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'fixedPenaltyPercentage',
            value,
            oneHour(),
        );
    }

    private getPriceDiscoveryCacheKey(
        priceDiscoveryAddress: string,
        ...args: any
    ) {
        return generateCacheKeyFromParams(
            'priceDiscovery',
            priceDiscoveryAddress,
            ...args,
        );
    }
}
