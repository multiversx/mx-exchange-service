import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { AnyBulkWriteOperation } from 'mongodb';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import { TokenPersistenceService } from 'src/modules/tokens/persistence/services/token.persistence.service';
import { Logger } from 'winston';
import { PairModel } from '../../models/pair.model';
import { quote } from '../../pair.utils';
import { PairAbiService } from '../../services/pair.abi.service';
import { PairService } from '../../services/pair.service';
import { PairDocument } from '../schemas/pair.schema';
import { PairRepository } from './pair.repository';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { PairComputeService } from '../../services/pair.compute.service';
import {
    PairsFilter,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { filteredPairsPipeline } from '../pipelines/filtered.pairs.pipeline';

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
        @Inject(forwardRef(() => TokenPersistenceService))
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
                const pair = await this.populatePairModel(pairMeta);

                await this.upsertPair(pair);

                counters.successful++;
            } catch (error) {
                this.logger.error(error, {
                    context: PairPersistenceService.name,
                });

                counters.failed++;

                continue;
            }
        }

        console.log(counters);

        this.logger.info('Finished populating pairs and tokens metadata', {
            context: PairPersistenceService.name,
        });
    }

    async populatePairsComputedFields(): Promise<void> {
        await this.updatePairsTokensPrice();
        await this.updatePairsLiquidityValuesUSD();
    }

    async populatePairModel(pairMetadata: PairMetadata): Promise<PairModel> {
        let pair = new PairModel({
            address: pairMetadata.address,
            firstTokenId: pairMetadata.firstTokenID,
            secondTokenId: pairMetadata.secondTokenID,
        });

        pair = await this.updatePairTokens(pairMetadata, pair);
        pair = await this.updateLpToken(pair);
        pair = await this.updateAbiFields(pair);

        pair.deployedAt = await this.pairCompute.computeDeployedAt(
            pair.address,
        );

        return pair;
    }

    async updatePairTokens(
        pairMetadata: PairMetadata,
        pair: PairModel,
    ): Promise<PairModel> {
        const [firstToken, secondToken] = await Promise.all([
            this.tokenPersistence.populateEsdtTokenMetadata(
                pairMetadata.firstTokenID,
            ),
            this.tokenPersistence.populateEsdtTokenMetadata(
                pairMetadata.secondTokenID,
            ),
        ]);

        if (firstToken === undefined) {
            throw new Error(
                `Could not get first token (${pairMetadata.firstTokenID}) for pair ${pair.address}`,
            );
        }

        if (secondToken === undefined) {
            throw new Error(
                `Could not get second token (${pairMetadata.secondTokenID}) for pair ${pair.address}`,
            );
        }

        pair.firstToken = firstToken._id;
        pair.secondToken = secondToken._id;

        return pair;
    }

    async updateLpToken(pair: PairModel): Promise<PairModel> {
        const lpTokenMetadata = await this.pairService.getLpToken(pair.address);

        if (lpTokenMetadata === undefined) {
            return pair;
        }

        lpTokenMetadata.type = EsdtTokenType.FungibleLpToken;
        lpTokenMetadata.pairAddress = pair.address;

        const lpToken = await this.tokenPersistence.upsertToken(
            lpTokenMetadata,
        );

        pair.liquidityPoolToken = lpToken;
        pair.liquidityPoolTokenId = lpToken.identifier;

        return pair;
    }

    async updatePairReserves(): Promise<void> {
        const pairs = await this.getPairs(
            {},
            {
                address: 1,
                info: 1,
            },
        );

        for (const pair of pairs) {
            pair.info = await this.pairAbi.pairInfoMetadata(pair.address);
            await pair.save();
        }
    }

    async updateAbiFields(pair: PairModel): Promise<PairModel> {
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

        return pair;
    }

    async updatePairsTokensPrice(): Promise<void> {
        const bulkOps: AnyBulkWriteOperation<PairDocument>[] = [];
        const [pairs, usdcPrice] = await Promise.all([
            this.getPairs(
                {},
                {
                    address: 1,
                    info: 1,
                    state: 1,
                    firstToken: 1,
                    firstTokenPrice: 1,
                    secondToken: 1,
                    secondTokenPrice: 1,
                },
                {
                    path: 'firstToken secondToken',
                    select: ['identifier', 'decimals'],
                },
            ),
            this.dataApi.getTokenPrice('USDC'),
        ]);

        pairs.forEach((pair) => {
            const { firstTokenPrice, secondTokenPrice } =
                this.computeTokensPrice(pair);

            bulkOps.push({
                updateOne: {
                    filter: { _id: pair._id },
                    update: {
                        $set: {
                            firstTokenPrice,
                            secondTokenPrice,
                        },
                    },
                },
            });
        });

        await this.bulkUpdatePairs(bulkOps);

        await this.tokenPersistence.bulkUpdatePairTokensPrice(usdcPrice);
    }

    async updatePairsLiquidityValuesUSD(): Promise<void> {
        const bulkOps: AnyBulkWriteOperation<PairDocument>[] = [];
        const [pairs, usdcPrice, commonTokenIDs] = await Promise.all([
            this.getPairs(
                {},
                {
                    address: 1,
                    info: 1,
                    state: 1,
                    firstToken: 1,
                    firstTokenPrice: 1,
                    firstTokenPriceUSD: 1,
                    firstTokenLockedValueUSD: 1,
                    secondToken: 1,
                    secondTokenPrice: 1,
                    secondTokenPriceUSD: 1,
                    secondTokenLockedValueUSD: 1,
                    liquidityPoolToken: 1,
                    liquidityPoolTokenPriceUSD: 1,
                    lockedValueUSD: 1,
                },
                {
                    path: 'firstToken secondToken liquidityPoolToken',
                    select: ['identifier', 'decimals', 'price'],
                },
            ),
            this.dataApi.getTokenPrice('USDC'),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        for (const pair of pairs) {
            const {
                firstTokenPriceUSD,
                firstTokenLockedValueUSD,
                secondTokenPriceUSD,
                secondTokenLockedValueUSD,
                lockedValueUSD,
                liquidityPoolTokenPriceUSD,
            } = await this.computeLiquidityValuesUSD(
                pair,
                usdcPrice,
                commonTokenIDs,
            );

            // console.log({
            //     firstTokenPriceUSD,
            //     firstTokenLockedValueUSD,
            //     secondTokenPriceUSD,
            //     secondTokenLockedValueUSD,
            //     lockedValueUSD,
            //     liquidityPoolTokenPriceUSD,
            // });

            bulkOps.push({
                updateOne: {
                    filter: { _id: pair._id },
                    update: {
                        $set: {
                            firstTokenPriceUSD,
                            firstTokenLockedValueUSD,
                            secondTokenPriceUSD,
                            secondTokenLockedValueUSD,
                            lockedValueUSD,
                            liquidityPoolTokenPriceUSD,
                        },
                    },
                },
            });
        }

        await this.bulkUpdatePairs(bulkOps);

        await this.tokenPersistence.bulkUpdatePairTokensLiquidityUSD(
            commonTokenIDs,
        );
    }

    async updatePairsAnalytics(): Promise<void> {
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
            pair.feesAPR = this.computeFeesAPR(pair);

            await pair.save();
        }
    }

    computeTokensPrice(pair: PairDocument): {
        firstTokenPrice: string;
        secondTokenPrice: string;
    } {
        const firstTokenPrice = this.getEquivalentForLiquidity(
            pair,
            pair.firstToken.identifier,
            new BigNumber(`1e${pair.firstToken.decimals}`).toFixed(),
        )
            .multipliedBy(`1e-${pair.secondToken.decimals}`)
            .toFixed();

        const secondTokenPrice = this.getEquivalentForLiquidity(
            pair,
            pair.secondToken.identifier,
            new BigNumber(`1e${pair.secondToken.decimals}`).toFixed(),
        )
            .multipliedBy(`1e-${pair.firstToken.decimals}`)
            .toFixed();

        return { firstTokenPrice, secondTokenPrice };
    }

    getEquivalentForLiquidity(
        pair: PairDocument,
        tokenInID: string,
        amount: string,
    ): BigNumber {
        switch (tokenInID) {
            case pair.firstToken.identifier:
                return quote(amount, pair.info.reserves0, pair.info.reserves1);
            case pair.secondToken.identifier:
                return quote(amount, pair.info.reserves1, pair.info.reserves0);
            default:
                return new BigNumber(0);
        }
    }

    async computeLiquidityValuesUSD(
        pair: PairDocument,
        usdcPrice: number,
        commonTokenIDs: string[],
        forceRepopulate = false,
    ): Promise<PairLiquidityValuesUSD> {
        if (
            forceRepopulate ||
            !pair.populated('firstToken secondToken liquidityPoolToken')
        ) {
            await pair.populate({
                path: 'firstToken secondToken liquidityPoolToken',
                select: ['identifier', 'decimals', 'price'],
            });
        }

        let firstTokenPriceUSD = pair.firstToken.price;
        let secondTokenPriceUSD = pair.secondToken.price;

        if (pair.firstToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            firstTokenPriceUSD = usdcPrice.toString();
            secondTokenPriceUSD = new BigNumber(pair.secondTokenPrice)
                .times(usdcPrice)
                .toFixed();
        }

        if (pair.secondToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            secondTokenPriceUSD = usdcPrice.toString();
            firstTokenPriceUSD = new BigNumber(pair.firstTokenPrice)
                .times(usdcPrice)
                .toFixed();
        }

        const firstTokenLockedValueUSD = new BigNumber(pair.info.reserves0)
            .multipliedBy(`1e-${pair.firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD)
            .toFixed();

        const secondTokenLockedValueUSD = new BigNumber(pair.info.reserves1)
            .multipliedBy(`1e-${pair.secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD)
            .toFixed();

        pair.firstTokenPriceUSD = firstTokenPriceUSD;
        pair.secondTokenPriceUSD = secondTokenPriceUSD;
        pair.firstTokenLockedValueUSD = firstTokenLockedValueUSD;
        pair.secondTokenLockedValueUSD = secondTokenLockedValueUSD;

        const lockedValueUSD = this.computeLockedValueUSD(pair, commonTokenIDs);

        const liquidityPoolTokenPriceUSD = this.computeLpTokenPriceUSD(pair);

        return {
            firstTokenPriceUSD,
            firstTokenLockedValueUSD,
            secondTokenPriceUSD,
            secondTokenLockedValueUSD,
            lockedValueUSD,
            liquidityPoolTokenPriceUSD,
        };
    }

    computeLpTokenPriceUSD(pair: PairModel): string {
        if (!pair.liquidityPoolToken) {
            return '0';
        }

        const lpPosition = this.pairService.computeLiquidityPosition(
            pair.info,
            new BigNumber(`1e${pair.liquidityPoolToken.decimals}`).toFixed(),
        );

        const firstTokenValueUSD = computeValueUSD(
            lpPosition.firstTokenAmount,
            pair.firstToken.decimals,
            pair.firstTokenPriceUSD,
        );

        const secondTokenValueUSD = computeValueUSD(
            lpPosition.secondTokenAmount,
            pair.secondToken.decimals,
            pair.secondTokenPriceUSD,
        );

        return firstTokenValueUSD.plus(secondTokenValueUSD).toFixed();
    }

    computeLockedValueUSD(pair: PairModel, commonTokenIDs: string[]): string {
        if (
            pair.state === 'Active' ||
            (commonTokenIDs.includes(pair.firstToken.identifier) &&
                commonTokenIDs.includes(pair.secondToken.identifier))
        ) {
            return new BigNumber(pair.firstTokenLockedValueUSD)
                .plus(pair.secondTokenLockedValueUSD)
                .toFixed();
        }

        if (
            commonTokenIDs.includesNone([
                pair.firstToken.identifier,
                pair.secondToken.identifier,
            ])
        ) {
            return '0';
        }

        const commonTokenLockedValueUSD = commonTokenIDs.includes(
            pair.firstToken.identifier,
        )
            ? new BigNumber(pair.firstTokenLockedValueUSD)
            : new BigNumber(pair.secondTokenLockedValueUSD);

        return commonTokenLockedValueUSD.multipliedBy(2).toFixed();
    }

    computeFeesAPR(pair: PairModel): string {
        const actualFees24hBig = new BigNumber(pair.feesUSD24h).multipliedBy(
            new BigNumber(pair.totalFeePercent - pair.specialFeePercent).div(
                pair.totalFeePercent,
            ),
        );

        const feesAPR = actualFees24hBig.times(365).div(pair.lockedValueUSD);

        return !feesAPR.isNaN() ? feesAPR.toFixed() : '0';
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

        try {
            const result = await this.pairRepository
                .getModel()
                .bulkWrite(bulkOps);

            this.logger.info(
                `Bulk update pairs | ${name ?? 'no op'} : ${JSON.stringify(
                    result,
                )}`,
            );
        } catch (error) {
            this.logger.error(error);
        }
    }

    async getPairs(
        filterQuery: FilterQuery<PairDocument>,
        projection?: ProjectionType<PairDocument>,
        populateOptions?: PopulateOptions,
    ): Promise<PairDocument[]> {
        const profiler = new PerformanceProfiler();

        const query = this.pairRepository
            .getModel()
            .find(filterQuery, projection);

        // const explanation = await query.explain().exec();

        // console.log(JSON.stringify(explanation));

        const pairs = await query.exec();

        if (populateOptions) {
            await this.pairRepository
                .getModel()
                .populate(pairs, populateOptions);
        }

        profiler.stop();

        console.log(`getPairs - ${profiler.duration}ms`);

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
            // select: ['identifier', 'decimals', 'price'],
        });

        profiler.stop();
        console.log('filtered pairs query', profiler.duration);
        // console.log(result.items, result.total);

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
            await pair.populate({
                path: 'firstToken secondToken',
                select: ['identifier', 'decimals'],
            });
        }

        return pair;
    }
}
