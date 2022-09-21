import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { oneDay, oneHour } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { SimpleLockType } from '../../models/simple.lock.model';
import { SimpleLockGetterService } from '../simple.lock.getter.service';
import { EnergyAbiService } from './energy.abi.service';

@Injectable()
export class EnergyGetterService extends SimpleLockGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly tokenGetter: TokenGetterService,
        private readonly energyAbiService: EnergyAbiService,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger, energyAbiService, tokenGetter);
        this.lockType = SimpleLockType.ENERGY_TYPE;
    }

    async getBaseAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('baseAssetTokenID'),
            () => this.energyAbiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getLockOptions(): Promise<number[]> {
        return await this.getData(
            this.getEnergyCacheKey('lockOptions'),
            () => this.energyAbiService.getLockOptions(),
            oneHour(),
        );
    }

    async getPauseState(): Promise<boolean> {
        return await this.getData(
            this.getEnergyCacheKey('pauseState'),
            () => this.energyAbiService.isPaused(),
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
