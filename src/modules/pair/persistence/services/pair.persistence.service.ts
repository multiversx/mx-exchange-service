import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import { TokenPersistenceService } from 'src/modules/tokens/persistence/services/token.persistence.service';
import { Logger } from 'winston';
import { PairModel } from '../../models/pair.model';
import { PairAbiService } from '../../services/pair.abi.service';
import { PairService } from '../../services/pair.service';
import { PairDocument } from '../schemas/pair.schema';
import { PairRepository } from './pair.repository';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PairComputeService } from '../../services/pair.compute.service';
import {
    PairsFilter,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { filteredPairsPipeline } from '../pipelines/filtered.pairs.pipeline';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { StateChangesProcessor } from 'src/modules/rabbitmq/state-changes/state.changes.processor';
import { EsdtTokenDocument } from 'src/modules/tokens/persistence/schemas/esdtToken.schema';

export type PairLiquidityValuesUSD = {
    firstTokenPriceUSD: string;
    firstTokenLockedValueUSD: string;
    secondTokenPriceUSD: string;
    secondTokenLockedValueUSD: string;
    lockedValueUSD: string;
    liquidityPoolTokenPriceUSD: string;
};

type FilteredPairsResponse = {
    items: PairDocument[];
    total: number;
};

@Injectable()
export class PairPersistenceService {
    constructor(
        private readonly pairRepository: PairRepository,
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly routerAbi: RouterAbiService,
        private readonly dataApi: MXDataApiService,
        private readonly tokenPersistence: TokenPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

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

    async populatePairModel(pairMetadata: PairMetadata): Promise<PairDocument> {
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
            firstToken: firstToken._id,
            firstTokenId: firstToken.identifier,
            secondToken: secondToken._id,
            secondTokenId: secondToken.identifier,
            info,
            state,
            deployedAt,
        };

        if (lpToken !== undefined) {
            rawPair.liquidityPoolToken = lpToken._id;
            rawPair.liquidityPoolTokenId = lpToken.identifier;
        }

        const pair = await this.pairRepository.create(rawPair);

        profiler.stop();

        this.logger.debug(
            `${this.populatePairModel.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );

        return pair;
    }

    async refreshPairsStateAndReserves(): Promise<void> {
        const pairs = await this.getPairs(
            {},
            {
                address: 1,
                info: 1,
                state: 1,
            },
        );

        for (const pair of pairs) {
            await this.updateStateAndReserves(pair);
        }
    }

    async refreshPairsAbiFields(): Promise<void> {
        const pairs = await this.getPairs(
            {},
            {
                address: 1,
            },
        );

        for (const pair of pairs) {
            await this.updateAbiFields(pair);
        }
    }

    async refreshPairsPricesAndTVL(): Promise<void> {
        const profiler = new PerformanceProfiler();

        const pairsMap = new Map();
        const tokensMap = new Map();

        const [pairs, tokens, usdcPrice, commonTokenIDs] = await Promise.all([
            this.getPairs(
                {},
                {
                    address: 1,
                    firstTokenId: 1,
                    firstTokenPrice: 1,
                    firstTokenPriceUSD: 1,
                    firstTokenLockedValueUSD: 1,
                    secondTokenId: 1,
                    secondTokenPrice: 1,
                    secondTokenPriceUSD: 1,
                    secondTokenLockedValueUSD: 1,
                    liquidityPoolTokenId: 1,
                    liquidityPoolTokenPriceUSD: 1,
                    lockedValueUSD: 1,
                    info: 1,
                    state: 1,
                },
            ),
            this.tokenPersistence.getTokens(
                {},
                {
                    identifier: 1,
                    decimals: 1,
                    price: 1,
                    derivedEGLD: 1,
                    liquidityUSD: 1,
                    type: 1,
                    pairAddress: 1,
                },
            ),
            this.dataApi.getTokenPrice('USDC'),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        pairs.forEach((pair) => {
            pairsMap.set(pair.address, pair);
        });

        tokens.forEach((token) => tokensMap.set(token.identifier, token));

        const stateChangesProcessor = new StateChangesProcessor(
            pairsMap,
            tokensMap,
            usdcPrice,
            commonTokenIDs,
        );
        const { pairBulkOps, tokenBulkOps } =
            stateChangesProcessor.recomputeAllValues();

        await Promise.all([
            this.bulkUpdatePairs(pairBulkOps, 'recomputeValues'),
            this.tokenPersistence.bulkUpdateTokens(
                tokenBulkOps,
                'recomputeValues',
            ),
        ]);

        profiler.stop();

        console.log({
            pairBulkOps: JSON.stringify(pairBulkOps),
            tokenBulkOps: JSON.stringify(tokenBulkOps),
            durationMs: profiler.duration,
        });
    }

    async refreshPairsAnalytics(): Promise<void> {
        const pairs = await this.getPairs(
            {},
            {
                address: 1,
                lockedValueUSD: 1,
                totalFeePercent: 1,
                specialFeePercent: 1,
            },
        );

        for (const pair of pairs) {
            const [
                firstTokenVolume,
                secondTokenVolume,
                volumeUSD24h,
                volumeUSD48h,
                feesUSD24h,
                feesUSD48h,
                previous24hLockedValueUSD,
                tradesCount,
                tradesCount24h,
            ] = await Promise.all([
                this.pairCompute.computeFirstTokenVolume(pair.address, '24h'),
                this.pairCompute.computeSecondTokenVolume(pair.address, '24h'),
                this.pairCompute.computeVolumeUSD(pair.address, '24h'),
                this.pairCompute.computeVolumeUSD(pair.address, '48h'),
                this.pairCompute.computeFeesUSD(pair.address, '24h'),
                this.pairCompute.computeFeesUSD(pair.address, '48h'),
                this.pairCompute.computePrevious24hLockedValueUSD(pair.address),
                this.pairCompute.tradesCount(pair.address),
                this.pairCompute.tradesCount24h(pair.address),
            ]);

            pair.firstTokenVolume24h = firstTokenVolume;
            pair.secondTokenVolume24h = secondTokenVolume;
            pair.volumeUSD24h = volumeUSD24h;
            pair.previous24hVolumeUSD = new BigNumber(volumeUSD48h)
                .minus(feesUSD24h)
                .toFixed();
            pair.feesUSD24h = feesUSD24h;
            pair.previous24hFeesUSD = new BigNumber(feesUSD48h)
                .minus(feesUSD24h)
                .toFixed();
            pair.previous24hLockedValueUSD = previous24hLockedValueUSD ?? '0';
            pair.tradesCount = tradesCount;
            pair.tradesCount24h = tradesCount24h;

            const actualFees24hBig = new BigNumber(feesUSD24h).multipliedBy(
                new BigNumber(
                    pair.totalFeePercent - pair.specialFeePercent,
                ).div(pair.totalFeePercent),
            );
            const feesAPR = actualFees24hBig
                .times(365)
                .div(pair.lockedValueUSD);

            pair.feesAPR = !feesAPR.isNaN() ? feesAPR.toFixed() : '0';

            await pair.save();
        }
    }

    async updateLpToken(pair: PairDocument): Promise<void> {
        const lpToken = await this.getPairLpToken(pair.address);

        if (lpToken === undefined) {
            return;
        }

        pair.liquidityPoolToken = lpToken;
        pair.liquidityPoolTokenId = lpToken.identifier;

        await pair.save();
    }

    async updateStateAndReserves(pair: PairDocument): Promise<void> {
        const [info, state] = await Promise.all([
            this.pairAbi.pairInfoMetadata(pair.address),
            this.pairAbi.state(pair.address),
        ]);

        pair.info = info;
        pair.state = state;

        await pair.save();
    }

    async updateAbiFields(pair: PairDocument): Promise<void> {
        const [
            info,
            totalFeePercent,
            specialFeePercent,
            feesCollectorCutPercentage,
            trustedSwapPairs,
            state,
            feeState,
            whitelistedAddresses,
            initialLiquidityAdder,
            feeDestinations,
            feesCollectorAddress,
        ] = await Promise.all([
            this.pairAbi.pairInfoMetadata(pair.address),
            this.pairAbi.totalFeePercent(pair.address),
            this.pairAbi.specialFeePercent(pair.address),
            this.pairAbi.feesCollectorCutPercentage(pair.address),
            this.pairAbi.trustedSwapPairs(pair.address),
            this.pairAbi.state(pair.address),
            this.pairAbi.feeState(pair.address),
            this.pairAbi.whitelistedAddresses(pair.address),
            this.pairAbi.initialLiquidityAdder(pair.address),
            this.pairAbi.feeDestinations(pair.address),
            this.pairAbi.feesCollectorAddress(pair.address),
        ]);

        pair.info = info;
        pair.totalFeePercent = totalFeePercent;
        pair.specialFeePercent = specialFeePercent;
        pair.feesCollectorCutPercentage =
            feesCollectorCutPercentage /
            constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS;
        pair.trustedSwapPairs = trustedSwapPairs;
        pair.state = state;
        pair.feeState = feeState;
        pair.whitelistedManagedAddresses = whitelistedAddresses;
        pair.initialLiquidityAdder = initialLiquidityAdder;
        pair.feeDestinations = feeDestinations;
        pair.feesCollectorAddress = feesCollectorAddress;

        await pair.save();
    }

    async getPairLpToken(
        address: string,
    ): Promise<EsdtTokenDocument | undefined> {
        const lpTokenMetadata = await this.pairService.getLpToken(address);

        if (lpTokenMetadata === undefined) {
            return undefined;
        }

        lpTokenMetadata.type = EsdtTokenType.FungibleLpToken;
        lpTokenMetadata.pairAddress = address;

        return this.tokenPersistence.upsertToken(lpTokenMetadata);
    }

    async getTotalLockedValueUSD(): Promise<string> {
        const [result] = await this.pairRepository
            .getModel()
            .aggregate<{ totalLockedValueUSD: string }>([
                {
                    $group: {
                        _id: null,
                        totalLockedValueUSD: {
                            $sum: { $toDecimal: '$lockedValueUSD' },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalLockedValueUSD: {
                            $toString: '$totalLockedValueUSD',
                        },
                    },
                },
            ])
            .exec();
        return result.totalLockedValueUSD;
    }

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

    async upsertPair(pair: PairModel): Promise<void> {
        try {
            await this.pairRepository.findOneAndUpdate(
                { address: pair.address },
                pair,
                {},
                true,
            );
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async bulkUpdatePairs(bulkOps: any[], name?: string): Promise<void> {
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
                    operation: name ?? 'no-op',
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

        // const explanation = await query.explain().exec();
        // console.log(JSON.stringify(explanation));
        // const pairs = await query.exec();

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

    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sorting: PairSortingArgs,
    ): Promise<{ pairs: PairModel[]; count: number }> {
        const profiler = new PerformanceProfiler();

        const [result] = await this.pairRepository
            .getModel()
            .aggregate<FilteredPairsResponse>(
                filteredPairsPipeline(offset, limit, filters, sorting),
            )
            .exec();

        await this.pairRepository.getModel().populate(result.items, {
            path: 'firstToken secondToken liquidityPoolToken',
        });

        profiler.stop();

        this.logger.debug(
            `${this.getFilteredPairs.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );

        return { pairs: result.items, count: result.total };
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
