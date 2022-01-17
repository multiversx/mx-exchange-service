import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

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

    async setStartEpoch(
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

    async setEndEpoch(
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
