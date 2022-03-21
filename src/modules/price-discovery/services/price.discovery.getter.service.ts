import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
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
        private readonly apiService: ElrondApiService,
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

    async getRewardsTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'rewardsTokenID',
            () => this.abiService.getExtraRewardsTokenID(priceDiscoveryAddress),
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

    async getLpTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(priceDiscoveryAddress),
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

    async getRewardsToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const rewardsTokenID = await this.getRewardsTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getTokenMetadata(rewardsTokenID);
    }

    async getRedeemToken(
        priceDiscoveryAddress: string,
    ): Promise<NftCollection> {
        const redeemTokenID = await this.getRedeemTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getNftCollectionMetadata(redeemTokenID);
    }

    async getLpToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(priceDiscoveryAddress);
        if (lpTokenID === elrondConfig.EGLDIdentifier) {
            return undefined;
        }
        return this.contextGetter.getTokenMetadata(lpTokenID);
    }

    async getLaunchedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const tokenID = await this.getLaunchedTokenID(priceDiscoveryAddress);
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenAmount',
            () =>
                this.apiService.getTokenBalanceForUser(
                    priceDiscoveryAddress,
                    tokenID,
                ),
            oneSecond() * 6,
        );
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const tokenID = await this.getAcceptedTokenID(priceDiscoveryAddress);
        return this.getData(
            priceDiscoveryAddress,
            'acceptedTokenAmount',
            () =>
                this.apiService.getTokenBalanceForUser(
                    priceDiscoveryAddress,
                    tokenID,
                ),
            oneSecond() * 6,
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
            oneSecond() * 6,
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
            oneSecond() * 6,
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
            oneSecond() * 6,
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
            oneSecond() * 6,
        );
    }

    async getLpTokensReceived(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'lpTokensReceived',
            () => this.abiService.getLpTokensReceived(priceDiscoveryAddress),
            oneMinute(),
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

    async getPairAddress(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'pairAddress',
            () => this.abiService.getPairAddress(priceDiscoveryAddress),
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

    async getExtraRewardsTokenID(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'extreRewardsTokenID',
            () => this.abiService.getExtraRewardsTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getExtraRewards(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'extraRewards',
            () => this.abiService.getExtraRewards(priceDiscoveryAddress),
            oneMinute(),
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
            'getFixedPenaltyPhaseDurationBlocks',
            () =>
                this.abiService.getFixedPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            oneHour(),
        );
    }

    async getUnbondPeriodEpochs(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'getUnbondPeriodEpochs',
            () => this.abiService.getUnbondPeriodEpochs(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'getPenaltyMinPercentage',
            () =>
                this.abiService.getPenaltyMinPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'getPenaltyMaxPercentage',
            () =>
                this.abiService.getPenaltyMaxPercentage(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'getFixedPenaltyPercentage',
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
