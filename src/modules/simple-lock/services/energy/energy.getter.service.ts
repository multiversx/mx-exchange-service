import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
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
        protected readonly abiService: EnergyAbiService,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger, abiService, tokenGetter, 'energy');
        this.lockType = SimpleLockType.ENERGY_TYPE;
    }

    async getBaseAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('baseAssetTokenID'),
            () => this.abiService.getBaseAssetTokenID(),
            oneHour(),
        );
    }

    async getBaseAssetToken(): Promise<EsdtToken> {
        const tokenID = await this.getBaseAssetTokenID();
        return await this.tokenGetter.getTokenMetadata(tokenID);
    }

    async getLockOptions(): Promise<number[]> {
        return await this.getData(
            this.getCacheKey('lockOptions'),
            () => this.abiService.getLockOptions(),
            oneHour(),
        );
    }

    async getPauseState(): Promise<boolean> {
        return await this.getData(
            this.getCacheKey('pauseState'),
            () => this.abiService.isPaused(),
            oneHour(),
        );
    }

    async getOwnerAddress(): Promise<string> {
        return await this.getData(
            this.getCacheKey('ownerAddress'),
            async () =>
                (
                    await this.apiService.getAccountStats(
                        scAddress.simpleLockEnergy,
                    )
                ).ownerAddress,
            oneSecond(),
        );
    }

    async getEnergyEntryForUser(userAddress: string): Promise<EnergyType> {
        return await this.getData(
            this.getCacheKey('energyEntry', userAddress),
            () => this.abiService.getEnergyEntryForUser(userAddress),
            oneMinute(),
        );
    }
}
