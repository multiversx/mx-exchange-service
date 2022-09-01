import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../../utils/generate-cache-key';
import { oneHour } from '../../../../helpers/helpers';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class ProxyFarmGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private abiService: AbiProxyFarmService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
    }

    async getwrappedFarmTokenID(): Promise<string> {
        return this.getData(
            this.getProxyFarmCacheKey('wrappedFarmTokenID'),
            () => this.abiService.getWrappedFarmTokenID(),
            oneHour(),
        );
    }

    async getwrappedFarmToken(): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID();
        return this.tokenGetter.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        return await this.getData(
            this.getProxyFarmCacheKey('intermediatedFarms'),
            () => this.abiService.getIntermediatedFarmsAddress(),
            oneHour(),
        );
    }

    private getProxyFarmCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxyFarm', ...args);
    }
}
