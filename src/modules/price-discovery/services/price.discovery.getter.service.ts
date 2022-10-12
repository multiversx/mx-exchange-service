import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { CachingService } from 'src/services/caching/cache.service';

import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './price.discovery.compute.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class PriceDiscoveryGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenGetter: TokenGetterService,
        private readonly abiService: PriceDiscoveryAbiService,
        @Inject(forwardRef(() => PriceDiscoveryComputeService))
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly pairGetter: PairGetterService,
    ) {
        super(cachingService, logger);
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenID',
            ),
            () => this.abiService.getLaunchedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenID',
            ),
            () => this.abiService.getAcceptedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'redeemTokenID',
            ),
            () => this.abiService.getRedeemTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getLaunchedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const launchedTokenID = await this.getLaunchedTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenGetter.getTokenMetadata(launchedTokenID);
    }

    async getAcceptedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const acceptedTokenID = await this.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenGetter.getTokenMetadata(acceptedTokenID);
    }

    async getRedeemToken(
        priceDiscoveryAddress: string,
    ): Promise<NftCollection> {
        const redeemTokenID = await this.getRedeemTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenGetter.getNftCollectionMetadata(redeemTokenID);
    }

    async getLaunchedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenAmount',
            ),
            () =>
                this.abiService.getLaunchedTokenBalance(priceDiscoveryAddress),
            oneSecond() * 12,
        );
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenAmount',
            ),
            () =>
                this.abiService.getAcceptedTokenBalance(priceDiscoveryAddress),
            oneSecond() * 12,
        );
    }

    async getLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenRedeemBalance',
            ),
            () =>
                this.abiService.getLaunchedTokenRedeemBalance(
                    priceDiscoveryAddress,
                ),
            oneSecond() * 12,
        );
    }

    async getAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenRedeemBalance',
            ),
            () =>
                this.abiService.getAcceptedTokenRedeemBalance(
                    priceDiscoveryAddress,
                ),
            oneSecond() * 12,
        );
    }

    async getLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenPrice',
            ),
            () =>
                this.priceDiscoveryCompute.computeLaunchedTokenPrice(
                    priceDiscoveryAddress,
                ),
            oneSecond() * 12,
        );
    }

    async getAcceptedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenPrice',
            ),
            () =>
                this.priceDiscoveryCompute.computeAcceptedTokenPrice(
                    priceDiscoveryAddress,
                ),
            oneSecond() * 12,
        );
    }

    async getLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'launchedTokenPriceUSD',
            ),
            () =>
                this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                    priceDiscoveryAddress,
                ),
            oneSecond() * 12,
        );
    }

    async getAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const acceptedTokenID = await this.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenPriceUSD',
            ),
            () => this.pairGetter.getTokenPriceUSD(acceptedTokenID),
            oneSecond() * 12,
        );
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'startEpoch'),
            () => this.abiService.getStartBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(priceDiscoveryAddress, 'endEpoch'),
            () => this.abiService.getEndBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'currentPhase',
            ),
            () => this.abiService.getCurrentPhase(priceDiscoveryAddress),
            oneMinute(),
        );
    }

    async getMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'minLaunchedTokenPrice',
            ),
            () =>
                this.abiService.getMinLaunchedTokenPrice(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'noLimitPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getNoLimitPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    async getLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'linearPenaltyPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getLinearPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    async getFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getFixedPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    async getLockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'lockingScAddress',
            ),
            () => this.abiService.getLockingScAddress(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getUnlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'unlockEpoch',
            ),
            () => this.abiService.getUnlockEpoch(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'penaltyMinPercentage',
            ),
            () =>
                this.abiService.getPenaltyMinPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'penaltyMaxPercentage',
            ),
            () =>
                this.abiService.getPenaltyMaxPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getPriceDiscoveryCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPercentage',
            ),
            () =>
                this.abiService.getFixedPenaltyPercentage(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    private getPriceDiscoveryCacheKey(
        priceDiscoveryAddress: string,
        ...args: any
    ) {
        return this.getCacheKey('priceDiscovery', priceDiscoveryAddress, ...args);
    }
}
