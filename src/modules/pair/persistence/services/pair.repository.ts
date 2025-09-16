import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { PairModel } from '../../models/pair.model';
import { PairDocument } from '../schemas/pair.schema';

@Injectable()
export class PairRepository extends EntityRepository<PairDocument> {
    constructor(
        @InjectModel(PairModel.name)
        private readonly pairModel: Model<PairDocument>,
    ) {
        super(pairModel);
    }

    getModel(): Model<PairDocument> {
        return this.pairModel;
    }
}
