import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { FarmModelV2 } from '../../farm/models/farm.v2.model';
import { FarmDocument } from '../schemas/farm.schema';

@Injectable()
export class FarmRepository extends EntityRepository<FarmDocument> {
    constructor(
        @InjectModel(FarmModelV2.name)
        private readonly farmModel: Model<FarmDocument>,
    ) {
        super(farmModel);
    }

    getModel(): Model<FarmDocument> {
        return this.farmModel;
    }
}
