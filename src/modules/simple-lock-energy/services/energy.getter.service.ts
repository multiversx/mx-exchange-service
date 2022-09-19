import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { EnergyAbiService } from './energy.abi.service';

@Injectable()
export class EnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: EnergyAbiService,
    ) {
        super(cachingService, logger);
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getBaseAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('baseAssetTokenID'),
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getLockOptions(): Promise<number[]> {
        return await this.getData(
            this.getEnergyCacheKey('lockOptions'),
            () => this.abiService.getLockOptions(),
            oneHour(),
        );
    }

    async getPauseState(): Promise<boolean> {
        return await this.getData(
            this.getEnergyCacheKey('pauseState'),
            () => this.abiService.isPaused(),
            oneHour(),
        );
    }

    private getEnergyCacheKey(...args: any): string {
        return generateCacheKeyFromParams('energy', args);
    }
}
