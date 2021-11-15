import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { NftCollection } from '../../../models/tokens/nftCollection.model';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneHour } from '../../../helpers/helpers';
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Injectable()
export class ProxyPairService {
    constructor(
        private abiService: AbiProxyPairService,
        private contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}
    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getProxyPairCacheKey(tokenCacheKey);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyPairService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getwrappedLpTokenID(): Promise<string> {
        return this.getTokenID('wrappedLpTokenID', () =>
            this.abiService.getWrappedLpTokenID(),
        );
    }

    async getwrappedLpToken(): Promise<NftCollection> {
        const wrappedLpTokenID = await this.getwrappedLpTokenID();
        return await this.contextGetter.getNftCollectionMetadata(
            wrappedLpTokenID,
        );
    }

    async getIntermediatedPairs(): Promise<string[]> {
        const cacheKey = this.getProxyPairCacheKey('intermediatedPairs');
        try {
            const getIntermediatedPairs = () =>
                this.abiService.getIntermediatedPairsAddress();
            return await this.cachingService.getOrSet(
                cacheKey,
                getIntermediatedPairs,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyPairService.name,
                this.getIntermediatedPairs.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    private getProxyPairCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyPair', ...args);
    }
}
