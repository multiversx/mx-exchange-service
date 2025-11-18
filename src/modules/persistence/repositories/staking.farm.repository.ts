import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { StakingFarmDocument } from '../schemas/staking.farm.schema';

@Injectable()
export class StakingFarmRepository extends EntityRepository<StakingFarmDocument> {
    constructor(
        @InjectModel(StakingModel.name)
        private readonly stakingFarmModel: Model<StakingFarmDocument>,
    ) {
        super(stakingFarmModel);
    }

    getModel(): Model<StakingFarmDocument> {
        return this.stakingFarmModel;
    }
}
