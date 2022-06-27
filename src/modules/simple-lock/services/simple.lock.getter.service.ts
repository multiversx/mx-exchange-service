import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { SimpleLockAbiService } from './simple.lock.abi.service';

@Injectable()
export class SimpleLockGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: SimpleLockAbiService,
        private readonly contextGetter: ContextGetterService,
    ) {
        super(cachingService, logger);
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
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
    }

    async getLpProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getLpProxyTokenID();
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
    }

    async getFarmProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getFarmProxyTokenID();
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
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
        return generateCacheKeyFromParams('simpleLock', ...args);
    }
}
