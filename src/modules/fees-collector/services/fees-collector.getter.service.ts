import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WeeklyRewardsSplittingGetterService } from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { Mixin } from 'ts-mixer';
import { IFeesCollectorGetterService } from '../interfaces';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FeesCollectorComputeService } from './fees-collector.compute.service';

@Injectable()
export class FeesCollectorGetterService
    extends Mixin(GenericGetterService, WeeklyRewardsSplittingGetterService)
    implements IFeesCollectorGetterService
{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FeesCollectorAbiService,
        protected readonly weeklyRewardsSplittingComputeService: WeeklyRewardsSplittingComputeService,
        @Inject(forwardRef(() => FeesCollectorComputeService))
        private readonly computeService: FeesCollectorComputeService,
    ) {
        super(cachingService, logger, abiService, weeklyRewardsSplittingComputeService);
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
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    getAccumulatedTokenForInflation(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(
                scAddress,
                'accumulatedFeesForInflation',
                week,
            ),
            () => this.computeService.computeAccumulatedFeesUntilNow(scAddress, week),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async getLockedTokenId(scAddress: string): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(
                scAddress,
                'lockedTokenId',
            ),
            () => this.abiService.lockedTokenId(scAddress),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockedTokensPerBlock(scAddress: string): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(
                scAddress,
                'lockedTokensPerBlock',
            ),
            () => this.abiService.lockedTokensPerBlock(scAddress),
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
