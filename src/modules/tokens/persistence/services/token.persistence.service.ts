import { Inject, Injectable } from '@nestjs/common';
import { TokenRepository } from './token.repository';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken } from '../../models/esdtToken.model';
import { FilterQuery, ProjectionType } from 'mongoose';
import { TokenService } from '../../services/token.service';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import {
    TokensFilter,
    TokenSortingArgs,
} from '../../models/tokens.filter.args';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { filteredTokensPipeline } from '../pipelines/filtered.tokens.pipeline';

type FilteredTokensResponse = {
    items: EsdtTokenDocument[];
    total: number;
};

@Injectable()
export class TokenPersistenceService {
    constructor(
        private readonly tokenRepository: TokenRepository,
        private readonly tokenService: TokenService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateEsdtTokenMetadata(
        tokenID: string,
    ): Promise<EsdtTokenDocument> {
        try {
            const tokenMetadata = await this.tokenService.tokenMetadata(
                tokenID,
            );
            const token = await this.upsertToken(tokenMetadata);

            return token;
        } catch (error) {
            return undefined;
        }
    }

    async addToken(token: EsdtToken): Promise<void> {
        try {
            await this.tokenRepository.create(token);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.info(
                    `Token ${token.identifier} already persisted`,
                    { context: TokenPersistenceService.name },
                );
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

    async bulkUpdateTokens(bulkOps: any[], name?: string): Promise<void> {
        if (bulkOps.length === 0) {
            return;
        }

        const profiler = new PerformanceProfiler();

        try {
            const result = await this.tokenRepository
                .getModel()
                .bulkWrite(bulkOps);

            profiler.stop();

            this.logger.info(
                `Bulk update tokens - ${profiler.duration}ms | ${
                    name ?? 'no-op'
                } : ${JSON.stringify(result)}`,
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
        return this.tokenRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();
    }

    async getFilteredTokens(
        offset: number,
        limit: number,
        filters: TokensFilter,
        sorting: TokenSortingArgs,
    ): Promise<{ tokens: EsdtToken[]; count: number }> {
        const profiler = new PerformanceProfiler();

        const [result] = await this.tokenRepository
            .getModel()
            .aggregate<FilteredTokensResponse>(
                filteredTokensPipeline(offset, limit, filters, sorting),
            )
            .exec();

        profiler.stop();
        console.log('filtered tokens query', profiler.duration);

        return { tokens: result.items, count: result.total };
    }
}
