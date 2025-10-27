import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokenRepository } from '../repositories/token.repository';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken, EsdtTokenType } from '../../tokens/models/esdtToken.model';
import { FilterQuery, ProjectionType } from 'mongoose';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { constantsConfig, tokenProviderUSD } from 'src/config';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import BigNumber from 'bignumber.js';
import { BulkWriteOperations } from '../entities';
import {
    TokensFilter,
    TokenSortingArgs,
} from 'src/modules/tokens/models/tokens.filter.args';
import { filteredTokensPipeline } from '../pipelines/filtered.tokens.pipeline';

type FilteredTokensResponse = {
    items: EsdtTokenDocument[];
    total: number;
};

@Injectable()
export class TokenPersistenceService {
    constructor(
        private readonly tokenRepository: TokenRepository,
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly analyticsQuery: AnalyticsQueryService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

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

    async bulkUpdateTokens(
        bulkOps: BulkWriteOperations<EsdtToken>,
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
        lean = false,
    ): Promise<EsdtTokenDocument[]> {
        const profiler = new PerformanceProfiler();

        const result = await this.tokenRepository
            .getModel()
            .find(filterQuery, projection, { lean })
            .exec();

        profiler.stop();

        this.logger.debug(`${this.getTokens.name} : ${profiler.duration}ms`, {
            context: TokenPersistenceService.name,
        });

        return result;
    }

    async populateEsdtTokenMetadata(
        tokenID: string,
    ): Promise<EsdtTokenDocument> {
        try {
            const [tokenMetadata, createdAt] = await Promise.all([
                this.tokenService.tokenMetadataRaw(tokenID),
                this.tokenCompute.computeTokenCreatedAtTimestamp(tokenID),
            ]);

            tokenMetadata.createdAt = createdAt;

            const token = await this.upsertToken(tokenMetadata);

            return token;
        } catch (error) {
            this.logger.error(error);
            return undefined;
        }
    }

    async refreshTokensAnalytics(): Promise<void> {
        const tokens = await this.getTokens(
            { type: EsdtTokenType.FungibleToken },
            { identifier: 1, derivedEGLD: 1, price: 1, previous24hPrice: 1 },
        );

        const wegldToken = tokens.find(
            (token) => token.identifier === tokenProviderUSD,
        );

        if (!wegldToken) {
            throw new Error(
                `Missing token provider in DB. Cannot refresh analytics`,
            );
        }

        const wrappedEGLDPrev24hPrice = await this.computeTokenPrevious24hPrice(
            wegldToken,
            wegldToken.previous24hPrice,
        );

        for (const token of tokens) {
            try {
                const [
                    volumeLast2D,
                    pricePrevious24h,
                    pricePrevious7D,
                    swapsCount,
                    previous24hSwapsCount,
                ] = await Promise.all([
                    this.tokenCompute.computeTokenLast2DaysVolumeUSD(
                        token.identifier,
                    ),
                    this.computeTokenPrevious24hPrice(
                        token,
                        wrappedEGLDPrev24hPrice,
                    ),
                    this.tokenCompute.computeTokenPrevious7dPrice(
                        token.identifier,
                    ),
                    this.tokenCompute.tokenSwapCount(token.identifier),
                    this.tokenCompute.tokenPrevious24hSwapCount(
                        token.identifier,
                    ),
                ]);

                token.volumeUSD24h = volumeLast2D.current;
                token.previous24hVolume = volumeLast2D.previous;
                token.previous24hPrice = pricePrevious24h;
                token.previous7dPrice = pricePrevious7D ?? '0';
                token.swapCount24h = swapsCount;
                token.previous24hSwapCount = previous24hSwapsCount;

                token.volumeUSDChange24h = this.computeTokenVolumeChange(token);
                token.priceChange24h = this.computeTokenPriceChange(
                    token,
                    '24h',
                );
                token.priceChange7d = this.computeTokenPriceChange(token, '7d');
                token.tradeChange24h = this.computeTokenTradeChange24h(token);

                token.trendingScore = this.tokenCompute.calculateTrendingScore(
                    token.volumeUSDChange24h,
                    token.priceChange24h,
                    token.tradeChange24h,
                );

                await token.save();
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing analytics for token ${token.identifier}`,
                    { context: TokenPersistenceService.name },
                );
                this.logger.error(error);
            }
        }
    }

    private async computeTokenPrevious24hPrice(
        token: EsdtTokenDocument,
        wrappedEGLDPrev24hPrice: string,
    ): Promise<string> {
        const values24h = await this.analyticsQuery.getValues24h({
            series: token.identifier,
            metric: 'priceUSD',
        });

        if (values24h.length > 0 && values24h[0]?.value === '0') {
            return new BigNumber(token.derivedEGLD)
                .times(wrappedEGLDPrev24hPrice)
                .toFixed();
        }

        return values24h[0]?.value ?? '0';
    }

    private computeTokenPriceChange(
        token: EsdtTokenDocument,
        period: '24h' | '7d',
    ): number {
        const currentPriceBN = new BigNumber(token.price);
        const previousPriceBN = new BigNumber(
            period === '24h' ? token.previous24hPrice : token.previous7dPrice,
        );

        if (previousPriceBN.isZero()) {
            return 0;
        }

        return currentPriceBN.dividedBy(previousPriceBN).toNumber();
    }

    private computeTokenVolumeChange(token: EsdtTokenDocument): number {
        const currentVolumeBN = new BigNumber(token.volumeUSD24h);
        const previous24hVolumeBN = new BigNumber(token.previous24hVolume);

        if (currentVolumeBN.isZero()) {
            return 0;
        }

        const maxPrevious24hVolume = BigNumber.maximum(
            previous24hVolumeBN,
            constantsConfig.trendingScore.MIN_24H_VOLUME,
        );

        return currentVolumeBN.dividedBy(maxPrevious24hVolume).toNumber();
    }

    private computeTokenTradeChange24h(token: EsdtTokenDocument): number {
        const currentSwapsBN = new BigNumber(token.swapCount24h);
        const previous24hSwapsBN = new BigNumber(token.previous24hSwapCount);

        const maxPrevious24hTradeCount = BigNumber.maximum(
            previous24hSwapsBN,
            constantsConfig.trendingScore.MIN_24H_TRADE_COUNT,
        );

        return currentSwapsBN.dividedBy(maxPrevious24hTradeCount).toNumber();
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

        this.logger.debug(
            `${this.getFilteredTokens.name} : ${profiler.duration}ms`,
            {
                context: TokenPersistenceService.name,
            },
        );

        return { tokens: result.items, count: result.total };
    }
}
