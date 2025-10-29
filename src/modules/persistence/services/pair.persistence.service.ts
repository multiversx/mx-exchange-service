import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { BulkUpdatesService } from './bulk.updates.service';
import { constantsConfig } from 'src/config';
import BigNumber from 'bignumber.js';
import { BulkWriteOperations } from '../entities';
import {
    PairsFilter,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { filteredPairsPipeline } from '../pipelines/filtered.pairs.pipeline';

type FilteredPairsResponse = {
    items: PairDocument[];
    total: number;
};

@Injectable()
export class PairPersistenceService {
    constructor(
        private readonly pairRepository: PairRepository,
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly dataApi: MXDataApiService,
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
        bulkOps: BulkWriteOperations<PairModel>,
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
        lean = false,
    ): Promise<PairDocument[]> {
        const profiler = new PerformanceProfiler();

        const pairs = await this.pairRepository
            .getModel()
            .find(filterQuery, projection, { lean })
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

    async populatePairs(): Promise<void> {
        this.logger.info(`Starting ${this.populatePairs.name}`, {
            context: PairPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();
        const pairsMetadata = await this.routerAbi.pairsMetadata();

        for (const pairMeta of pairsMetadata) {
            try {
                await this.populatePairModel(pairMeta);
            } catch (error) {
                this.logger.error(error, {
                    context: PairPersistenceService.name,
                });
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.populatePairs.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
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

    async updateLpToken(pair: PairDocument): Promise<void> {
        const lpToken = await this.getPairLpToken(pair.address);

        if (lpToken === undefined) {
            return;
        }

        pair.liquidityPoolToken = lpToken;
        pair.liquidityPoolTokenId = lpToken.identifier;

        await pair.save();
    }

    async refreshPairsPricesAndTVL(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPairsPricesAndTVL.name}`, {
            context: PairPersistenceService.name,
        });

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

        const stateChangesProcessor = new BulkUpdatesService(
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

        this.logger.debug(
            `Finished ${this.refreshPairsPricesAndTVL.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
    }

    async refreshPairsStateAndReserves(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPairsStateAndReserves.name}`, {
            context: PairPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const pairs = await this.getPairs(
            {},
            {
                address: 1,
                info: 1,
                state: 1,
            },
        );

        for (const pair of pairs) {
            try {
                await this.updateStateAndReserves(pair);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing state and reserves for pair ${pair.address}`,
                    { context: PairPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshPairsStateAndReserves.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
    }

    async updateStateAndReserves(pair: PairDocument): Promise<void> {
        const [info, state] = await Promise.all([
            this.pairAbi.getPairInfoMetadataRaw(pair.address),
            this.pairAbi.getStateRaw(pair.address),
        ]);

        pair.info = info;
        pair.state = state;

        await pair.save();
    }

    async refreshPairsAbiFields(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPairsAbiFields.name}`, {
            context: PairPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const pairs = await this.getPairs(
            {},
            {
                address: 1,
            },
        );

        for (const pair of pairs) {
            try {
                await this.updateAbiFields(pair);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing ABI fields for pair ${pair.address}`,
                    { context: PairPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshPairsAbiFields.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
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
            this.pairAbi.getPairInfoMetadataRaw(pair.address),
            this.pairAbi.getTotalFeePercentRaw(pair.address),
            this.pairAbi.getSpecialFeePercentRaw(pair.address),
            this.pairAbi.getFeesCollectorCutPercentageRaw(pair.address),
            this.pairAbi.getTrustedSwapPairsRaw(pair.address),
            this.pairAbi.getStateRaw(pair.address),
            this.pairAbi.getFeeStateRaw(pair.address),
            this.pairAbi.getWhitelistedAddressesRaw(pair.address),
            this.pairAbi.getInitialLiquidityAdderRaw(pair.address),
            this.pairAbi.getFeeDestinationsRaw(pair.address),
            this.pairAbi.getFeesCollectorAddressRaw(pair.address),
        ]);

        pair.info = info;
        pair.totalFeePercent = new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
        pair.specialFeePercent = new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
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

    async refreshPairsAnalytics(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPairsAnalytics.name}`, {
            context: PairPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

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
            try {
                await this.updateAnalytics(pair);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing analytics for pair ${pair.address}`,
                    { context: PairPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshPairsAnalytics.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
    }

    async updateAnalytics(pair: PairDocument): Promise<void> {
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
            new BigNumber(pair.totalFeePercent - pair.specialFeePercent).div(
                pair.totalFeePercent,
            ),
        );
        const feesAPR = actualFees24hBig.times(365).div(pair.lockedValueUSD);

        pair.feesAPR = !feesAPR.isNaN() ? feesAPR.toFixed() : '0';

        await pair.save();
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
}
