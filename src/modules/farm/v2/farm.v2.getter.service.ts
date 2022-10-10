import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmComputeService } from '../farm.compute.service';
import { FarmGetterService } from '../farm.getter.service';
import { FarmV2AbiService } from './farm.v2.abi.service';

@Injectable()
export class FarmV2GetterService extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmV2AbiService,
        @Inject(forwardRef(() => FarmComputeService))
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

    async getBoostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        return await this.getData(
            this.getFarmCacheKey(
                farmAddress,
                'boostedYieldsRewardsPercenatage',
            ),
            () =>
                this.abiService.getBoostedYieldsRewardsPercenatage(farmAddress),
            oneMinute(),
        );
    }

    async getCurrentWeek(farmAddress: string): Promise<number> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'currentWeek'),
            () => this.abiService.getCurrentWeek(farmAddress),
            oneMinute(),
        );
    }

    async getEnergyFactoryAddress(farmAddress: string): Promise<string> {
        return await this.getData(
            this.getFarmCacheKey(farmAddress, 'energyFactoryAddress'),
            () => this.abiService.getEnergyFactoryAddress(farmAddress),
            oneMinute(),
        );
    }
}
