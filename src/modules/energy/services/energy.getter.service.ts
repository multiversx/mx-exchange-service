import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { LockOption } from '../models/simple.lock.energy.model';
import { EnergyAbiService } from './energy.abi.service';
import { IEnergyGetterService } from './interfaces';

@Injectable()
export class EnergyGetterService
    extends GenericGetterService
    implements IEnergyGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly abiService: EnergyAbiService,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'energy';
    }

    async getBaseAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('baseAssetTokenID'),
            () => this.abiService.getBaseAssetTokenID(),
            oneHour(),
        );
    }

    async getBaseAssetToken(): Promise<EsdtToken> {
        const tokenID = await this.getBaseAssetTokenID();
        return await this.tokenGetter.getTokenMetadata(tokenID);
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenId(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLockedToken(): Promise<NftCollection> {
        const collection = await this.getLockedTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(collection);
    }

    async getLegacyLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('legacyLockedTokenID'),
            () => this.abiService.getLegacyLockedTokenId(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLegacyLockedToken(): Promise<NftCollection> {
        const collection = await this.getLegacyLockedTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(collection);
    }

    async getFeesBurnPercentage(): Promise<number> {
        return await this.getData(
            this.getCacheKey('feesBurnPercentage'),
            () => this.abiService.getFeesBurnPercentage(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFeesCollectorAddress(): Promise<string> {
        return await this.getData(
            this.getCacheKey('feesCollectorAddress'),
            () => this.abiService.getFeesCollectorAddress(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLastEpochFeeSentToCollector(): Promise<number> {
        return await this.getData(
            this.getCacheKey('lastEpochFeeSentToCollector'),
            () => this.abiService.getLastEpochFeeSentToCollector(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFeesFromPenaltyUnlocking(): Promise<string> {
        return await this.getData(
            this.getCacheKey('feesFromPenaltyUnlocking'),
            () => this.abiService.getFeesFromPenaltyUnlocking(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockOptions(): Promise<LockOption[]> {
        return await this.getData(
            this.getEnergyCacheKey('lockOptions'),
            () => this.abiService.getLockOptions(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPauseState(): Promise<boolean> {
        return await this.getData(
            this.getEnergyCacheKey('pauseState'),
            () => this.abiService.isPaused(),
            oneHour(),
        );
    }

    async getOwnerAddress(): Promise<string> {
        return await this.getData(
            this.getEnergyCacheKey('ownerAddress'),
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
            this.getEnergyCacheKey('energyEntry', userAddress),
            () => this.abiService.getEnergyEntryForUser(userAddress),
            oneMinute(),
        );
    }

    private getEnergyCacheKey(...args: any): string {
        return generateCacheKeyFromParams('energy', args);
    }
}
