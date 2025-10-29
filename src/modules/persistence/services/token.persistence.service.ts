import { Inject, Injectable } from '@nestjs/common';
import { TokenRepository } from '../repositories/token.repository';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { FilterQuery, ProjectionType } from 'mongoose';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

@Injectable()
export class TokenPersistenceService {
    constructor(
        private readonly tokenRepository: TokenRepository,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addToken(token: EsdtToken): Promise<void> {
        try {
            await this.tokenRepository.create(token);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.warn(
                    `Token ${token.identifier} already persisted`,
                    { context: TokenPersistenceService.name },
                );
                return;
            }
            this.logger.error(`Failed insert for ${token.identifier}`);
            this.logger.error(error);

            throw error;
        }
    }

    async upsertToken(
        token: EsdtToken,
        projection: ProjectionType<EsdtToken> = { __v: 0 },
    ): Promise<EsdtTokenDocument> {
        try {
            return this.tokenRepository
                .getModel()
                .findOneAndUpdate({ identifier: token.identifier }, token, {
                    new: true,
                    upsert: true,
                    projection,
                });
        } catch (error) {
            this.logger.error(`Failed upsert for token ${token.identifier}`);
            this.logger.error(error);
            throw error;
        }
    }

    async bulkUpdateTokens(
        bulkOps: any[],
        operationName?: string,
    ): Promise<void> {
        if (bulkOps.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        try {
            const result = await this.tokenRepository
                .getModel()
                .bulkWrite(bulkOps);

            profiler.stop();

            this.logger.debug(
                `${this.bulkUpdateTokens.name} : ${profiler.duration}ms`,
                {
                    context: TokenPersistenceService.name,
                    operation: operationName ?? 'no-op',
                    result,
                },
            );
        } catch (error) {
            profiler.stop();
            this.logger.error(error);
        }
    }

    async getTokens(
        filterQuery: FilterQuery<EsdtTokenDocument>,
        projection?: ProjectionType<EsdtTokenDocument>,
    ): Promise<EsdtTokenDocument[]> {
        const profiler = new PerformanceProfiler();

        const result = await this.tokenRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();

        profiler.stop();

        this.logger.debug(`${this.getTokens.name} : ${profiler.duration}ms`, {
            context: TokenPersistenceService.name,
        });

        return result;
    }
}
