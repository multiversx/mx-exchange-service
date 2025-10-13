import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from '../../pair/models/pair.model';
import { PairDocument } from '../schemas/pair.schema';
import { PairRepository } from '../repositories/pair.repository';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { TokenPersistenceService } from './token.persistence.service';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';

@Injectable()
export class PairPersistenceService {
    constructor(
        private readonly pairRepository: PairRepository,
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly pairAbi: PairAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addPair(pair: PairModel): Promise<void> {
        try {
            await this.pairRepository.create(pair);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.info(`Pair ${pair.address} already persisted`, {
                    context: PairPersistenceService.name,
                });
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

    async populatePairs(): Promise<void> {
        this.logger.info('Starting populate pairs', {
            context: PairPersistenceService.name,
        });

        const pairsMetadata = await this.routerAbi.pairsMetadata();

        const counters = {
            successful: 0,
            failed: 0,
        };

        for (const pairMeta of pairsMetadata) {
            try {
                await this.populatePairModel(pairMeta);

                counters.successful++;
            } catch (error) {
                this.logger.error(error, {
                    context: PairPersistenceService.name,
                });

                counters.failed++;

                continue;
            }
        }

        this.logger.info('Finished populating pairs and tokens metadata', {
            context: PairPersistenceService.name,
        });
    }

    async populatePairModel(
        pairMetadata: PairMetadata,
        timestamp?: number,
    ): Promise<PairDocument> {
        const profiler = new PerformanceProfiler();

        const { firstTokenID, secondTokenID, address } = pairMetadata;

        const [firstToken, secondToken, lpToken, deployedAt, info, state] =
            await Promise.all([
                this.tokenPersistence.populateEsdtTokenMetadata(firstTokenID),
                this.tokenPersistence.populateEsdtTokenMetadata(secondTokenID),
                this.getPairLpToken(address),
                this.pairCompute.computeDeployedAt(address),
                this.pairAbi.pairInfoMetadata(address),
                this.pairAbi.state(address),
            ]);

        if (firstToken === undefined || secondToken === undefined) {
            throw new Error(
                `Could not get tokens (${firstTokenID}, ${secondTokenID}) for pair ${address}`,
            );
        }

        const rawPair: Partial<PairModel> = {
            address,
            firstToken: firstToken._id,
            firstTokenId: firstToken.identifier,
            secondToken: secondToken._id,
            secondTokenId: secondToken.identifier,
            info,
            state,
            deployedAt: deployedAt ?? timestamp ?? 0,
        };

        if (lpToken !== undefined) {
            rawPair.liquidityPoolToken = lpToken._id;
            rawPair.liquidityPoolTokenId = lpToken.identifier;
        }

        const pair = await this.upsertPair(rawPair as PairModel);

        profiler.stop();

        this.logger.debug(
            `${this.populatePairModel.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
                address,
                tokens: `${firstTokenID}/${secondTokenID}`,
            },
        );

        return pair;
    }

    async getPairLpToken(
        address: string,
    ): Promise<EsdtTokenDocument | undefined> {
        const lpTokenMetadata = await this.pairService.getLpTokenRaw(address);

        if (lpTokenMetadata === undefined) {
            return undefined;
        }

        lpTokenMetadata.type = EsdtTokenType.FungibleLpToken;
        lpTokenMetadata.pairAddress = address;

        return this.tokenPersistence.upsertToken(lpTokenMetadata);
    }
}
