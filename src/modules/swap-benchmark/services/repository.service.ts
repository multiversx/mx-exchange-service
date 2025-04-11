import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import {
    HistoricalSwapDocument,
    HistoricalSwapDbModel,
} from '../schemas/historical.swap.schema';
import {
    PairSnapshotDbModel,
    PairSnapshotDocument,
} from '../schemas/pair.snapshot.schema';
import {
    HypotheticalSwap,
    HypotheticalSwapDocument,
    HypotheticalSwapResult,
    HypotheticalSwapResultDocument,
} from '../schemas/hypothetical.swap.schema';

@Injectable()
export class HistoricalSwapRepositoryService extends EntityRepository<HistoricalSwapDocument> {
    constructor(
        @InjectModel(HistoricalSwapDbModel.name)
        private readonly historicalSwapModel: Model<HistoricalSwapDocument>,
    ) {
        super(historicalSwapModel);
    }

    getEntity(): Model<HistoricalSwapDocument> {
        return this.historicalSwapModel;
    }
}

@Injectable()
export class PairSnapshotRepositoryService extends EntityRepository<PairSnapshotDocument> {
    constructor(
        @InjectModel(PairSnapshotDbModel.name)
        private readonly pairSnapshotModel: Model<PairSnapshotDocument>,
    ) {
        super(pairSnapshotModel);
    }

    async findPaginated(
        entityFilterQuery: FilterQuery<PairSnapshotDbModel>,
        limit: number,
        offset: number,
    ): Promise<PairSnapshotDocument[] | null> {
        const result = await this.pairSnapshotModel
            .find(entityFilterQuery)
            .limit(limit)
            .skip(offset)
            .exec();
        return result;
    }

    getEntity(): Model<PairSnapshotDocument> {
        return this.pairSnapshotModel;
    }
}

@Injectable()
export class HypotheticalSwapRepositoryService extends EntityRepository<HypotheticalSwapDocument> {
    constructor(
        @InjectModel(HypotheticalSwap.name)
        private readonly model: Model<HypotheticalSwapDocument>,
    ) {
        super(model);
    }

    getEntity(): Model<HypotheticalSwapDocument> {
        return this.model;
    }
}

@Injectable()
export class HypotheticalSwapResultRepositoryService extends EntityRepository<HypotheticalSwapResultDocument> {
    constructor(
        @InjectModel(HypotheticalSwapResult.name)
        private readonly model: Model<HypotheticalSwapResultDocument>,
    ) {
        super(model);
    }

    getEntity(): Model<HypotheticalSwapResultDocument> {
        return this.model;
    }
}
