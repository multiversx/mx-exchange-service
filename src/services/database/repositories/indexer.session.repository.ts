import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from './entity.repository';
import {
    IndexerSession,
    IndexerSessionDocument,
} from 'src/modules/analytics-indexer/schemas/indexer.session.schema';

@Injectable()
export class IndexerSessionRepositoryService extends EntityRepository<IndexerSessionDocument> {
    constructor(
        @InjectModel(IndexerSession.name)
        private readonly indexerSessionModel: Model<IndexerSessionDocument>,
    ) {
        super(indexerSessionModel);
    }
}
