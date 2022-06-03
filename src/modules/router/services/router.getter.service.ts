import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from '../models/pair.metadata.model';
import { RouterComputeService } from './router.compute.service';
import { PairTokens } from 'src/modules/pair/models/pair.model';

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
