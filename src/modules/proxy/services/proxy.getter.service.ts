import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiProxyService } from './proxy-abi.service';

@Injectable()
export class ProxyGetterService {
    constructor(
        private readonly abiService: AbiProxyService,
        private readonly cachingService: CachingService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getProxyCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getAssetTokenID(): Promise<string> {
        return await this.getData(
            'assetTokenID',
            () => this.abiService.getAssetTokenID(),
            oneHour(),
        );
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getData(
            'lockedAssetTokenID',
            () => this.abiService.getLockedAssetTokenID(),
            oneHour(),
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return this.contextGetter.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID();
        return this.contextGetter.getNftCollectionMetadata(lockedAssetTokenID);
    }

    private getProxyCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxy', ...args);
    }
}
