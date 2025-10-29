import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from '../../pair/models/pair.model';
import { PairDocument } from '../schemas/pair.schema';
import { PairRepository } from '../repositories/pair.repository';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

@Injectable()
export class PairPersistenceService {
    constructor(
        private readonly pairRepository: PairRepository,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addPair(pair: PairModel): Promise<void> {
        try {
            await this.pairRepository.create(pair);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.warn(`Pair ${pair.address} already persisted`, {
                    context: PairPersistenceService.name,
                });
                return;
            }
            this.logger.error(`Failed to insert pair ${pair.address}`);
            this.logger.error(error);

            throw error;
        }
    }

    async upsertPair(
        pair: PairModel,
        projection: ProjectionType<PairModel> = { __v: 0 },
    ): Promise<PairDocument> {
        try {
            return this.pairRepository
                .getModel()
                .findOneAndUpdate({ address: pair.address }, pair, {
                    new: true,
                    upsert: true,
                    projection,
                });
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async bulkUpdatePairs(
        bulkOps: any[],
        operationName?: string,
    ): Promise<void> {
        if (bulkOps.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        try {
            const result = await this.pairRepository
                .getModel()
                .bulkWrite(bulkOps);

            profiler.stop();

            this.logger.debug(
                `${this.bulkUpdatePairs.name} - ${profiler.duration}ms`,
                {
                    context: PairPersistenceService.name,
                    operation: operationName ?? 'no-op',
                    result,
                },
            );
        } catch (error) {
            profiler.stop();
            this.logger.error(error, { context: PairPersistenceService.name });
        }
    }

    async getPairs(
        filterQuery: FilterQuery<PairDocument>,
        projection?: ProjectionType<PairDocument>,
        populateOptions?: PopulateOptions,
    ): Promise<PairDocument[]> {
        const profiler = new PerformanceProfiler();

        const pairs = await this.pairRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();

        if (populateOptions) {
            await this.pairRepository
                .getModel()
                .populate(pairs, populateOptions);
        }

        profiler.stop();

        this.logger.debug(`${this.getPairs.name} : ${profiler.duration}ms`, {
            context: PairPersistenceService.name,
        });

        return pairs;
    }

    async getPair(
        filterQuery: FilterQuery<PairDocument>,
        projection?: ProjectionType<PairDocument>,
        populateOptions?: PopulateOptions,
    ): Promise<PairDocument> {
        const pair = await this.pairRepository
            .getModel()
            .findOne(filterQuery, projection)
            .exec();

        if (populateOptions) {
            await pair.populate(populateOptions);
        }

        return pair;
    }
}
