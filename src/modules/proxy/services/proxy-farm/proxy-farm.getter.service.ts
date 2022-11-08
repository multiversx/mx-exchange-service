import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { oneHour } from '../../../../helpers/helpers';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class ProxyFarmGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private abiService: AbiProxyFarmService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'proxyFarm';
    }

    async getwrappedFarmTokenID(proxyAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(proxyAddress, 'wrappedFarmTokenID'),
            () => this.abiService.getWrappedFarmTokenID(proxyAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getwrappedFarmToken(proxyAddress: string): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.getwrappedFarmTokenID(
            proxyAddress,
        );
        return this.tokenGetter.getNftCollectionMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(proxyAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(proxyAddress, 'intermediatedFarms'),
            () => this.abiService.getIntermediatedFarmsAddress(proxyAddress),
            oneHour(),
        );
    }
}
