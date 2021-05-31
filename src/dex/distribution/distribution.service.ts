import { Injectable } from '@nestjs/common';
import { scAddress } from '../../config';
import {
    CommunityDistributionModel,
    DistributionMilestoneModel,
    DistributionModel,
} from '../models/distribution.model';
import { CacheDistributionService } from 'src/services/cache-manager/cache-distribution.service';
import { AbiDistributionService } from './abi-distribution.service';

@Injectable()
export class DistributionService {
    constructor(
        private abiService: AbiDistributionService,
        private cacheService: CacheDistributionService,
    ) {}

    async getDistributionInfo(): Promise<DistributionModel> {
        const distributionContract = new DistributionModel();
        distributionContract.address = scAddress.distributionAddress;
        return distributionContract;
    }

    async getDistributionMilestones(): Promise<DistributionMilestoneModel[]> {
        const cachedData = await this.cacheService.getMilestones();
        if (!!cachedData) {
            return cachedData.milestones;
        }

        const milestones = await this.abiService.getDistributionMilestones();

        this.cacheService.setMilestones({ milestones: milestones });

        return milestones;
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const cachedEpoch = await this.cacheService.getEpoch();
        const cachedAmount = await this.cacheService.getAmount();
        const cachedMilestones = await this.cacheService.getMilestones();

        if (!!cachedEpoch && !!cachedAmount && !!cachedMilestones) {
            return {
                epoch: cachedEpoch.epoch,
                amount: cachedAmount.amount,
                milestones: cachedMilestones.milestones,
            };
        }
        const communityDistribution = await this.abiService.getCommunityDistribution();
        const amount = communityDistribution[0].valueOf();
        const epoch = communityDistribution[1].valueOf();
        const milestones = await this.getDistributionMilestones();

        this.cacheService.setEpoch({ epoch: epoch });
        this.cacheService.setAmount({ amount: amount });

        return {
            epoch: epoch,
            amount: amount,
            milestones: milestones,
        };
    }
}
