import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmComputeService } from '../farm.compute.service';
import { FarmGetterService } from '../farm.getter.service';
import { FarmCustomAbiService } from './farm.custom.abi.service';

@Injectable()
export class FarmCustomGetterService extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmCustomAbiService,
        protected readonly computeService: FarmComputeService,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: ElrondApiService,
    ) {
        super(
            cachingService,
            logger,
            abiService,
            computeService,
            tokenGetter,
            apiService,
        );
    }

    async getWhitelist(farmAddress: string): Promise<string[]> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'whitelist'),
            () => this.abiService.getWhitelist(farmAddress),
            oneHour(),
        );
    }
}
