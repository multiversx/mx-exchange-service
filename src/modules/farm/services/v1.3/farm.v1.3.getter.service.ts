import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmGetterService } from '../farm.getter.service';
import { FarmV13AbiService } from './farm.v1.3.abi.service';
import { FarmV13ComputeService } from './farm.v1.3.compute.service';

@Injectable()
export class FarmV13GetterService extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmV13AbiService,
        @Inject(forwardRef(() => FarmV13ComputeService))
        protected readonly computeService: FarmV13ComputeService,
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
