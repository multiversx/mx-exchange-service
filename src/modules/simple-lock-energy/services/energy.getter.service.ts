import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { oneDay, oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { Energy } from '../models/simple.lock.energy.model';
import { EnergyAbiService } from './energy.abi.service';

@Injectable()
export class EnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: EnergyAbiService,
        private readonly apiService: ElrondApiService,
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

    async getOwner(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('owner'),
            async () =>
                (
                    await this.apiService.getAccountStats(
                        scAddress.simpleLockEnergy,
                    )
                ).owner,
            oneDay(),
        );
    }

    async getEnergyEntryForUser(userAddress: string): Promise<Energy> {
        return await this.getData(
            this.getEnergyCacheKey('energyEntry', userAddress),
            () => this.abiService.getEnergyEntryForUser(userAddress),
            oneMinute(),
        );
    }

    private getEnergyCacheKey(...args: any): string {
        return generateCacheKeyFromParams('energy', args);
    }
}
