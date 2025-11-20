import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { GlobalInfoDocument } from '../schemas/global.info.schema';

@Injectable()
export class GlobalInfoRepository extends EntityRepository<GlobalInfoDocument> {
    constructor(
        @InjectModel(GlobalInfoByWeekModel.name)
        private readonly globalInfoModel: Model<GlobalInfoDocument>,
    ) {
        super(globalInfoModel);
    }

    getModel(): Model<GlobalInfoDocument> {
        return this.globalInfoModel;
    }
}
