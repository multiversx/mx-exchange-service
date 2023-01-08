import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Analytics, AnalyticsDocument } from 'src/modules/remote-config/schemas/analytics.schema';
import { EntityRepository } from './entity.repository';


@Injectable()
export class AnalyticsRepositoryService extends EntityRepository<AnalyticsDocument> {
    constructor(
        @InjectModel(Analytics.name) private readonly analyticsModel: Model<AnalyticsDocument>,
    ) {
        super(analyticsModel);
    }
}
