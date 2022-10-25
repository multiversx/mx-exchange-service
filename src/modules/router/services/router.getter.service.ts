import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from '../models/pair.metadata.model';
import { RouterComputeService } from './router.compute.service';
import { PairTokens } from 'src/modules/pair/models/pair.model';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { IRouterGetterService } from "../interfaces";

@Injectable()
export class RouterGetterService extends GenericGetterService implements IRouterGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiRouterService,
        @Inject(forwardRef(() => RouterComputeService))
        private readonly routerComputeService: RouterComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'router';
    }

    async getAllPairsAddress(): Promise<string[]> {
        return this.getData(
            this.getCacheKey('pairsAddress'),
            () => this.abiService.getAllPairsAddress(),
            oneMinute(),
        );
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return this.getData(
            this.getCacheKey('pairsMetadata'),
            () => this.abiService.getPairsMetadata(),
            oneMinute(),
        );
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.getPairsMetadata();
        return pairs.find((pair) => pair.address === pairAddress);
    }

    async getEnableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        return await this.getData(
            this.getCacheKey('enableSwapByUserConfig'),
            () => this.abiService.getEnableSwapByUserConfig(),
            oneHour(),
        );
    }

    async getCommonTokensForUserPairs(): Promise<string[]> {
        return await this.getData(
            this.getCacheKey('commonTokensForUserPairs'),
            () => this.abiService.getCommonTokensForUserPairs(),
            oneMinute(),
        );
    }

    async getTotalLockedValueUSD(): Promise<string> {
        return this.getData(
            this.getCacheKey('totalLockedValueUSD'),
            () => this.routerComputeService.computeTotalLockedValueUSD(),
            oneMinute(),
        );
    }

    async getTotalVolumeUSD(time: string): Promise<string> {
        return this.getData(
            this.getCacheKey(`totalVolumeUSD.${time}`),
            () => this.routerComputeService.computeTotalVolumeUSD(time),
            oneMinute() * 5,
        );
    }

    async getTotalFeesUSD(time: string): Promise<string> {
        return this.getData(
            this.getCacheKey(`totalFeesUSD.${time}`),
            () => this.routerComputeService.computeTotalFeesUSD(time),
            oneMinute() * 5,
        );
    }

    async getPairCount(): Promise<number> {
        return this.getData(
            this.getCacheKey('pairCount'),
            async () => (await this.getAllPairsAddress()).length,
            oneHour(),
        );
    }

    async getTotalTxCount(): Promise<number> {
        return this.getData(
            this.getCacheKey('totalTxCount'),
            () => this.routerComputeService.computeTotalTxCount(),
            oneMinute() * 30,
        );
    }

    async getPairCreationEnabled(): Promise<boolean> {
        return this.getData(
            'pairCreationEnabled',
            () => this.abiService.getPairCreationEnabled(),
            oneHour(),
        );
    }

    async getLastErrorMessage(): Promise<string> {
        return this.getData(
            'lastErrorMessage',
            () => this.abiService.getLastErrorMessage(),
            oneSecond(),
        );
    }

    async getState(): Promise<boolean> {
        return this.getData(
            'state',
            () => this.abiService.getState(),
            oneHour(),
        );
    }

    async getOwner(): Promise<string> {
        return this.getData(
            'owner',
            () => this.abiService.getOwner(),
            oneHour(),
        );
    }

    async getAllPairsManagedAddresses(): Promise<string[]> {
        return this.getData(
            'pairsManagedAddresses',
            () => this.abiService.getAllPairsManagedAddresses(),
            oneHour(),
        );
    }

    async getAllPairTokens(): Promise<PairTokens[]> {
        return this.getData(
            'pairsTokens',
            () => this.abiService.getAllPairTokens(),
            oneHour(),
        );
    }

    async getPairTemplateAddress(): Promise<string> {
        return this.getData(
            'pairTemplateAddress',
            () => this.abiService.getPairTemplateAddress(),
            oneHour(),
        );
    }

    async getTemporaryOwnerPeriod(): Promise<string> {
        return this.getData(
            'temporaryOwnerPeriod',
            () => this.abiService.getTemporaryOwnerPeriod(),
            oneMinute() * 10,
        );
    }
}
