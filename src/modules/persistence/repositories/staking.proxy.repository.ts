import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { StakingProxyDocument } from '../schemas/staking.proxy.schema';

@Injectable()
export class StakingProxyRepository extends EntityRepository<StakingProxyDocument> {
    constructor(
        @InjectModel(StakingProxyModel.name)
        private readonly stakingProxyModel: Model<StakingProxyDocument>,
    ) {
        super(stakingProxyModel);
    }

    getModel(): Model<StakingProxyDocument> {
        return this.stakingProxyModel;
    }
}
