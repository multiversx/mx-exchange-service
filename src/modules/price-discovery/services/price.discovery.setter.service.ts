import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';

export class PriceDiscoverySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'priceDiscovery';
    }

    async setLaunchedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(priceDiscoveryAddress, 'startEpoch'),
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
            this.getCacheKey(priceDiscoveryAddress, 'endEpoch'),
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
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
            this.getCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPercentage',
            ),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
