import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from './entity.repository';
import {
    AnalyticsReindexState,
    AnalyticsReindexStateDocument,
} from 'src/modules/remote-config/schemas/analytics.reindex.state.schema';

@Injectable()
export class AnalyticsReindexRepositoryService extends EntityRepository<AnalyticsReindexStateDocument> {
    constructor(
        @InjectModel(AnalyticsReindexState.name)
        private readonly analyticsReindexStateModel: Model<AnalyticsReindexStateDocument>,
    ) {
        super(analyticsReindexStateModel);
    }
}
