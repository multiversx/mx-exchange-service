import { Inject, Injectable } from '@nestjs/common';
import { ContextService } from '../../../services/context/context.service';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneHour } from '../../../helpers/helpers';

@Injectable()
export class ProxyFarmService {
    constructor(
        private abiService: AbiProxyFarmService,
        private context: ContextService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getProxyFarmCacheKey(tokenCacheKey);
        try {
            return this.cachingService.getOrSet(
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
        }
    }

    async getwrappedFarmTokenID(): Promise<string> {
        return this.getTokenID('wrappedFarmTokenID', () =>
            this.abiService.getWrappedFarmTokenID(),
        );
    }

    async getwrappedFarmToken(): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID();
        return this.context.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        const cacheKey = this.getProxyFarmCacheKey('intermediatedFarms');
        try {
            const getIntermediatedFarms = () =>
                this.abiService.getIntermediatedFarmsAddress();
            return this.cachingService.getOrSet(
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
        }
    }

    private getProxyFarmCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyFarm', ...args);
    }
}
