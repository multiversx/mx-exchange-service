import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import {
    WeeklyRewardsSplittingGetterService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { Mixin } from 'ts-mixer';
import { oneMinute } from '../../../helpers/helpers';
import { IFeesCollectorGetterService } from "../interfaces";
import { FeesCollectorComputeService } from "./fees-collector.compute.service";

@Injectable()
export class FeesCollectorGetterService extends Mixin(GenericGetterService, WeeklyRewardsSplittingGetterService) implements IFeesCollectorGetterService{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: FeesCollectorAbiService,
        @Inject(forwardRef(() => FeesCollectorComputeService))
        private readonly feesCollectorCompute: FeesCollectorComputeService,
    ) {
        super(cachingService, logger);
    }

    async getAccumulatedFees(scAddress: string, week: number, token: string): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress, 'accumulatedFees', week, token),
            () => this.abiService.accumulatedFees(scAddress, week, token),
            oneMinute(),
        )
    }

    async getTotalRewardsForWeekPriceUSD(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress, 'totalRewardsForWeekPriceUSD', week),
            () => this.feesCollectorCompute.computeTotalRewardsForWeekPriceUSD(scAddress, week),
            oneMinute(),
        )
    }

    async getTotalLockedTokensForWeekPriceUSD(scAddress: string, week: number): Promise<string> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress, 'totalLockedTokensForWeekPriceUSD', week),
            () => this.feesCollectorCompute.computeTotalLockedTokensForWeekPriceUSD(scAddress, week),
            oneMinute(),
        )
    }

    async getAllTokens(scAddress: string): Promise<string[]> {
        return this.getData(
            this.getFeesCollectorCacheKey(scAddress, 'allTokens'),
            () => this.abiService.allTokens(scAddress),
            oneMinute(),
        )
    }


    private getFeesCollectorCacheKey(address: string, ...args: any) {
        return generateCacheKeyFromParams(address, ...args);
    }


}
