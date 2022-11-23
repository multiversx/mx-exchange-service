import { Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WeeklyRewardsSplittingGetterService } from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { Mixin } from 'ts-mixer';
import { IFeesCollectorGetterService } from '../interfaces';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';

@Injectable()
export class FeesCollectorGetterService
    extends Mixin(GenericGetterService, WeeklyRewardsSplittingGetterService)
    implements IFeesCollectorGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FeesCollectorAbiService,
        protected readonly computeService: WeeklyRewardsSplittingComputeService,
    ) {
        super(cachingService, logger, abiService, computeService);
    }

    async getAccumulatedFees(
        scAddress: string,
        week: number,
        token: string,
    ): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(
                scAddress,
                'accumulatedFees',
                week,
                token,
            ),
            () => this.abiService.accumulatedFees(scAddress, week, token),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getAccumulatedLockedFees(
        scAddress: string,
        week: number,
        token: string,
    ): Promise<EsdtTokenPayment[]> {
        return this.getData(
            this.getFeesCollectorCacheKey(
                scAddress,
                'accumulatedLockedFees',
                week,
                token,
            ),
            () => this.abiService.accumulatedLockedFees(scAddress, week, token),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getAllTokens(scAddress: string): Promise<string[]> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress, 'allTokens'),
            () => this.abiService.allTokens(scAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    private getFeesCollectorCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }
}
