import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from '../models/pair.metadata.model';
import { RouterComputeService } from './router.compute.service';
import { PairTokens } from 'src/modules/pair/dto/pair-tokens.model';

@Injectable()
export class RouterGetterService {
    constructor(
        private readonly cachingService: CachingService,
        private readonly abiService: AbiRouterService,
        @Inject(forwardRef(() => RouterComputeService))
        private readonly routerComputeService: RouterComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getRouterCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getAllPairsAddress(): Promise<string[]> {
        return this.getData(
            'pairsAddress',
            () => this.abiService.getAllPairsAddress(),
            oneMinute(),
        );
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return this.getData(
            'pairsMetadata',
            async () => this.abiService.getPairsMetadata(),
            oneMinute(),
        );
    }

    async getTotalLockedValueUSD(): Promise<string> {
        return this.getData(
            'totalLockedValueUSD',
            () => this.routerComputeService.computeTotalLockedValueUSD(),
            oneMinute(),
        );
    }

    async getTotalVolumeUSD(time: string): Promise<string> {
        return this.getData(
            `totalVolumeUSD.${time}`,
            () => this.routerComputeService.computeTotalVolumeUSD(time),
            oneMinute(),
        );
    }

    async getTotalFeesUSD(time: string): Promise<string> {
        return this.getData(
            `totalFeesUSD.${time}`,
            () => this.routerComputeService.computeTotalFeesUSD(time),
            oneMinute(),
        );
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }

    async getPairCreationEnabled(): Promise<boolean> {
        return this.getData(
            'pairCreationEnabled',
            () => this.abiService.getPairCreationEnabled(),
            oneMinute(),
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
            'getState',
            () => this.abiService.getState(),
            oneMinute(),
        );
    }

    async getOwner(): Promise<string> {
        return this.getData(
            'getState',
            () => this.abiService.getOwner(),
            oneMinute(),
        );
    }

    async getAllPairsManagedAddresses(): Promise<string[]> {
        return this.getData(
            'getAllPairsManagedAddresses',
            () => this.abiService.getAllPairsManagedAddresses(),
            oneMinute(),
        );
    }

    async getAllPairTokens(): Promise<PairTokens[]> {
        return this.getData(
            'getAllPairTokens',
            () => this.abiService.getAllPairTokens(),
            oneSecond(),
        );
    }

    async getPairTemplateAddress(): Promise<string> {
        return this.getData(
            'getPairTemplateAddress',
            () => this.abiService.getPairTemplateAddress(),
            oneSecond(),
        );
    }

    async getTemporaryOwnerPeriod(): Promise<string> {
        return this.getData(
            'getTemporaryOwnerPeriod',
            () => this.abiService.getTemporaryOwnerPeriod(),
            oneSecond(),
        );
    }
}
