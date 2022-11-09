import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { ProxyGetterService } from '../../services/proxy.getter.service';
import { ProxyAbiServiceV2 } from './proxy.v2.abi.service';

@Injectable()
export class ProxyGetterServiceV2 extends ProxyGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: ProxyAbiServiceV2,
        protected readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger, abiService, tokenGetter);
    }
}
