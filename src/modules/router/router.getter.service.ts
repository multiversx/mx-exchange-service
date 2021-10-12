import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from './models/pair.metadata.model';
import { RouterComputeService } from './router.compute.service';

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
            return this.cachingService.getOrSet(cacheKey, createValueFunc, ttl);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterGetterService.name,
                this.getData.name,
                cacheKey,
                error,
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
            () => this.abiService.getPairsMetadata(),
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
}
