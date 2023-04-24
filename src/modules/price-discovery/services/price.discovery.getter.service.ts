import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './price.discovery.compute.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

@Injectable()
export class PriceDiscoveryGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenGetter: TokenGetterService,
        private readonly abiService: PriceDiscoveryAbiService,
        @Inject(forwardRef(() => PriceDiscoveryComputeService))
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly pairCompute: PairComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'priceDiscovery';
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'launchedTokenID'),
            () => this.abiService.getLaunchedTokenID(priceDiscoveryAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'acceptedTokenID'),
            () => this.abiService.getAcceptedTokenID(priceDiscoveryAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'redeemTokenID'),
            () => this.abiService.getRedeemTokenID(priceDiscoveryAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
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
            this.getCacheKey(priceDiscoveryAddress, 'launchedTokenAmount'),
            () =>
                this.abiService.getLaunchedTokenBalance(priceDiscoveryAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'acceptedTokenAmount'),
            () =>
                this.abiService.getAcceptedTokenBalance(priceDiscoveryAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(
                priceDiscoveryAddress,
                'launchedTokenRedeemBalance',
            ),
            () =>
                this.abiService.getLaunchedTokenRedeemBalance(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(
                priceDiscoveryAddress,
                'acceptedTokenRedeemBalance',
            ),
            () =>
                this.abiService.getAcceptedTokenRedeemBalance(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'launchedTokenPrice'),
            () =>
                this.priceDiscoveryCompute.computeLaunchedTokenPrice(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getAcceptedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'acceptedTokenPrice'),
            () =>
                this.priceDiscoveryCompute.computeAcceptedTokenPrice(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'launchedTokenPriceUSD'),
            () =>
                this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const acceptedTokenID = await this.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'acceptedTokenPriceUSD'),
            () => this.pairCompute.tokenPriceUSD(acceptedTokenID),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'startEpoch'),
            () => this.abiService.getStartBlock(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'endEpoch'),
            () => this.abiService.getEndBlock(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'currentPhase'),
            () => this.abiService.getCurrentPhase(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'minLaunchedTokenPrice'),
            () =>
                this.abiService.getMinLaunchedTokenPrice(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(
                priceDiscoveryAddress,
                'noLimitPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getNoLimitPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(
                priceDiscoveryAddress,
                'linearPenaltyPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getLinearPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(
                priceDiscoveryAddress,
                'fixedPenaltyPhaseDurationBlocks',
            ),
            () =>
                this.abiService.getFixedPenaltyPhaseDurationBlocks(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'lockingScAddress'),
            () => this.abiService.getLockingScAddress(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLockingSC(
        priceDiscoveryAddress: string,
    ): Promise<SimpleLockModel> {
        const address = await this.getLockingScAddress(priceDiscoveryAddress);
        return new SimpleLockModel({ address });
    }

    async getUnlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'unlockEpoch'),
            () => this.abiService.getUnlockEpoch(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPenaltyMinPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'penaltyMinPercentage'),
            () =>
                this.abiService.getPenaltyMinPercentage(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'penaltyMaxPercentage'),
            () =>
                this.abiService.getPenaltyMaxPercentage(priceDiscoveryAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return this.getData(
            this.getCacheKey(priceDiscoveryAddress, 'fixedPenaltyPercentage'),
            () =>
                this.abiService.getFixedPenaltyPercentage(
                    priceDiscoveryAddress,
                ),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
