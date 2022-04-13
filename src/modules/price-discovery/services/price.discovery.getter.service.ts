import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './price.discovery.compute.service';
@Injectable()
export class PriceDiscoveryGetterService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        private readonly abiService: PriceDiscoveryAbiService,
        @Inject(forwardRef(() => PriceDiscoveryComputeService))
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly pairGetter: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        priceDiscoveryAddress: string,
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getPriceDiscoveryCacheKey(
            priceDiscoveryAddress,
            key,
        );
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PriceDiscoveryGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenID',
            () => this.abiService.getLaunchedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'acceptedTokenID',
            () => this.abiService.getAcceptedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'redeemTokenID',
            () => this.abiService.getRedeemTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getLaunchedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const launchedTokenID = await this.getLaunchedTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getTokenMetadata(launchedTokenID);
    }

    async getAcceptedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const acceptedTokenID = await this.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getTokenMetadata(acceptedTokenID);
    }

    async getRedeemToken(
        priceDiscoveryAddress: string,
    ): Promise<NftCollection> {
        const redeemTokenID = await this.getRedeemTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getNftCollectionMetadata(redeemTokenID);
    }

    async getLaunchedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenAmount',
            () =>
                this.abiService.getLaunchedTokenBalance(priceDiscoveryAddress),
            oneSecond() * 12,
        );
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'acceptedTokenAmount',
            () =>
                this.abiService.getAcceptedTokenBalance(priceDiscoveryAddress),
            oneSecond() * 12,
        );
    }

    async getLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenRedeemBalance',
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
            priceDiscoveryAddress,
            'acceptedTokenRedeemBalance',
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
            priceDiscoveryAddress,
            'launchedTokenPrice',
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
            priceDiscoveryAddress,
            'acceptedTokenPrice',
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
            priceDiscoveryAddress,
            'launchedTokenPriceUSD',
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
            priceDiscoveryAddress,
            'acceptedTokenPriceUSD',
            () => this.pairGetter.getTokenPriceUSD(acceptedTokenID),
            oneSecond() * 12,
        );
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'startEpoch',
            () => this.abiService.getStartBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'endEpoch',
            () => this.abiService.getEndBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        return this.getData(
            priceDiscoveryAddress,
            'currentPhase',
            () => this.abiService.getCurrentPhase(priceDiscoveryAddress),
            oneMinute(),
        );
    }

    async getMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'minLaunchedTokenPrice',
            () =>
                this.abiService.getMinLaunchedTokenPrice(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'noLimitPhaseDurationBlocks',
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
            priceDiscoveryAddress,
            'linearPenaltyPhaseDurationBlocks',
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
            priceDiscoveryAddress,
            'fixedPenaltyPhaseDurationBlocks',
            () =>
                this.abiService.getFixedPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    async getLockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'lockingScAddress',
            () => this.abiService.getLockingScAddress(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getUnlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'unlockEpoch',
            () => this.abiService.getUnlockEpoch(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'penaltyMinPercentage',
            () =>
                this.abiService.getPenaltyMinPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'penaltyMaxPercentage',
            () =>
                this.abiService.getPenaltyMaxPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'fixedPenaltyPercentage',
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
        return generateCacheKeyFromParams(
            'priceDiscovery',
            priceDiscoveryAddress,
            ...args,
        );
    }
}
