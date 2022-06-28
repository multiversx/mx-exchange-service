import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';

export class PriceDiscoverySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setLaunchedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenID',
            ),
            value,
            oneHour(),
        );
    }

    async setAcceptedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenID',
            ),
            value,
            oneHour(),
        );
    }

    async setRedeemTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'redeemTokenID',
            ),
            value,
            oneHour(),
        );
    }

    async setLaunchedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenAmount',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenAmount',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenRedeemBalance',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenRedeemBalance',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenPrice',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenPrice',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenPriceUSD',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenPriceUSD',
            ),
            value,
            oneSecond() * 12,
        );
    }

    async setStartBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'startEpoch'),
            value,
            oneHour(),
        );
    }

    async setEndBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'endEpoch'),
            value,
            oneHour(),
        );
    }

    async setCurrentPhase(
        priceDiscoveryAddress: string,
        value: PhaseModel,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'currentPhase',
            ),
            value,
            oneMinute(),
        );
    }

    async setMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'minLaunchedTokenPrice',
            ),
            value,
            oneHour(),
        );
    }

    async setNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'noLimitPhaseDurationBlocks',
            ),
            value,
            oneHour(),
        );
    }

    async setLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'linearPenaltyPhaseDurationBlocks',
            ),
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPhaseDurationBlocks',
            ),
            value,
            oneHour(),
        );
    }

    async setLockingScAddress(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'lockingScAddress',
            ),
            value,
            oneHour(),
        );
    }

    async setUnlockEpoch(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'unlockEpoch',
            ),
            value,
            oneHour(),
        );
    }

    async setPenaltyMinPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'penaltyMinPercentage',
            ),
            value,
            oneHour(),
        );
    }

    async setPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'penaltyMaxPercentage',
            ),
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPercentage',
            ),
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
