import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../../utils/generate-log-message';
import { oneHour } from '../../../../helpers/helpers';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { cacheConfig } from 'src/config';

@Injectable()
export class ProxyFarmGetterService {
    constructor(
        private abiService: AbiProxyFarmService,
        private contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getProxyFarmCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyFarmGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getwrappedFarmTokenID(): Promise<string> {
        return this.getData(
            'wrappedFarmTokenID',
            () => this.abiService.getWrappedFarmTokenID(),
            oneHour(),
        );
    }

    async getwrappedFarmToken(): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID();
        return this.contextGetter.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        return await this.getData(
            'intermediatedFarms',
            () => this.abiService.getIntermediatedFarmsAddress(),
            oneHour(),
        );
    }

    private getProxyFarmCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyFarm', ...args);
    }
}
