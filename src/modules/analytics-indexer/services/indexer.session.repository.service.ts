import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import {
    IndexerSession,
    IndexerSessionDocument,
} from '../schemas/indexer.session.schema';

@Injectable()
export class IndexerSessionRepositoryService extends EntityRepository<IndexerSessionDocument> {
    constructor(
        @InjectModel(IndexerSession.name)
        private readonly indexerSessionModel: Model<IndexerSessionDocument>,
    ) {
        super(indexerSessionModel);
    }
}
