import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { pairs } from 'src/modules/pair/mocks/pair.constants';
import { PairDocument } from '../schemas/pair.schema';
import { PairPersistenceService } from '../services/pair.persistence.service';

export class PairPersistenceServiceMock {
    async getPairs(
        filterQuery: FilterQuery<PairDocument>,
        projection?: ProjectionType<PairDocument>,
        populateOptions?: PopulateOptions,
    ) {
        return pairs;
    }
}

export const PairPersistenceServiceProvider = {
    provide: PairPersistenceService,
    useClass: PairPersistenceServiceMock,
};
