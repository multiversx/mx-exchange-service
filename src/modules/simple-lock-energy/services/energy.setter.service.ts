import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class EnergySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setLockedTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getEnergyCacheKey('lockedTokenID'),
            value,
            oneHour(),
        );
    }

    async getBaseAssetTokenID(value: string): Promise<string> {
        return await this.setData(
            this.getEnergyCacheKey('baseAssetTokenID'),
            value,
            oneHour(),
        );
    }

    async setLockOptions(values: number[]): Promise<string> {
        return await this.setData(
            this.getEnergyCacheKey('lockOptions'),
            values,
            oneHour(),
        );
    }

    async setPauseState(value: boolean): Promise<string> {
        return await this.setData(
            this.getEnergyCacheKey('pauseState'),
            value,
            oneHour(),
        );
    }

    private getEnergyCacheKey(...args: any): string {
        return generateCacheKeyFromParams('energy', args);
    }
}
