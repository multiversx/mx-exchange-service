import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { SimpleLockType } from '../models/simple.lock.model';
import { SimpleLockAbiService } from './simple.lock.abi.service';

@Injectable()
export class SimpleLockGetterService extends GenericGetterService {
    protected lockType: SimpleLockType;

    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: SimpleLockAbiService,
        protected readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.lockType = SimpleLockType.BASE_TYPE;
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getSimpleLockCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getLpProxyTokenID(): Promise<string> {
        return await this.getData(
            this.getSimpleLockCacheKey('lpProxyTokenID'),
            () => this.abiService.getLpProxyTokenID(),
            oneHour(),
        );
    }

    async getFarmProxyTokenID(): Promise<string> {
        return await this.getData(
            this.getSimpleLockCacheKey('farmProxyTokenID'),
            () => this.abiService.getFarmProxyTokenID(),
            oneHour(),
        );
    }

    async getLockedToken(): Promise<NftCollection> {
        const tokenID = await this.getLockedTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getLpProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getLpProxyTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getFarmProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getFarmProxyTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getIntermediatedPairs(): Promise<string[]> {
        return await this.getData(
            this.getSimpleLockCacheKey('intermediatedPairs'),
            () => this.abiService.getKnownLiquidityPools(),
            oneMinute(),
        );
    }

    async getIntermediatedFarms(): Promise<string[]> {
        return await this.getData(
            this.getSimpleLockCacheKey('intermediatedFarms'),
            () => this.abiService.getKnownFarms(),
            oneMinute(),
        );
    }

    private getSimpleLockCacheKey(...args: any) {
        return generateCacheKeyFromParams('simpleLock', this.lockType, ...args);
    }
}
