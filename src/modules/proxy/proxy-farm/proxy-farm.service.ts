import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneHour } from '../../../helpers/helpers';
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Injectable()
export class ProxyFarmService {
    constructor(
        private abiService: AbiProxyFarmService,
        private contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getProxyFarmCacheKey(tokenCacheKey);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyFarmService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getwrappedFarmTokenID(): Promise<string> {
        return this.getTokenID('wrappedFarmTokenID', () =>
            this.abiService.getWrappedFarmTokenID(),
        );
    }

    async getwrappedFarmToken(): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID();
        return this.contextGetter.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        const cacheKey = this.getProxyFarmCacheKey('intermediatedFarms');
        try {
            const getIntermediatedFarms = () =>
                this.abiService.getIntermediatedFarmsAddress();
            return await this.cachingService.getOrSet(
                cacheKey,
                getIntermediatedFarms,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyFarmService.name,
                this.getIntermediatedFarms.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    private getProxyFarmCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyFarm', ...args);
    }
}
