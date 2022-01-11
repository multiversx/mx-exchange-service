import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { oneHour } from 'src/helpers/helpers';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { cacheConfig } from 'src/config';

@Injectable()
export class ProxyPairGetterService {
    constructor(
        private abiService: AbiProxyPairService,
        private contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getProxyPairCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyPairGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getwrappedLpTokenID(): Promise<string> {
        return await this.getData(
            'wrappedLpTokenID',
            () => this.abiService.getWrappedLpTokenID(),
            oneHour(),
        );
    }

    async getwrappedLpToken(): Promise<NftCollection> {
        const wrappedLpTokenID = await this.getwrappedLpTokenID();
        return await this.contextGetter.getNftCollectionMetadata(
            wrappedLpTokenID,
        );
    }

    async getIntermediatedPairs(): Promise<string[]> {
        return await this.getData(
            'intermediatedPairs',
            () => this.abiService.getIntermediatedPairsAddress(),
            oneHour(),
        );
    }

    private getProxyPairCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyPair', ...args);
    }
}
