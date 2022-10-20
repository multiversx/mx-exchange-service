import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { FarmComputeServiceV1_3 } from './farm.v1.3.compute.service';

@Injectable()
export class FarmGetterServiceV1_3 extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmAbiServiceV1_3,
        @Inject(forwardRef(() => FarmComputeServiceV1_3))
        protected readonly computeService: FarmComputeServiceV1_3,
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

    async getFarmAPR(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(farmAddress, 'farmAPR'),
            () => this.computeService.computeFarmAPR(farmAddress),
            oneMinute(),
        );
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        return this.getData(
            this.getCacheKey(farmAddress, 'migrationConfig'),
            () => this.abiService.getFarmMigrationConfiguration(farmAddress),
            oneHour(),
        );
    }
}
