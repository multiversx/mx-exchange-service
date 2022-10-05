import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
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
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
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
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
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
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
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
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
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
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setStartBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'startEpoch'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setEndBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'endEpoch'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
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
