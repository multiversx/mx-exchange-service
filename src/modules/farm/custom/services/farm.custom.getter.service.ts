import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Logger } from 'winston';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { FarmCustomAbiService } from './farm.custom.abi.service';
import { FarmCustomComputeService } from './farm.custom.compute.service';

@Injectable()
export class FarmCustomGetterService extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmCustomAbiService,
        protected readonly computeService: FarmCustomComputeService,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: MXApiService,
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
            this.getCacheKey(farmAddress, 'whitelist'),
            () => this.abiService.getWhitelist(farmAddress),
            oneHour(),
        );
    }
}
