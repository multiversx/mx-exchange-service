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
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { BulkUpdatesService } from './bulk.updates.service';
import { constantsConfig } from 'src/config';

@Injectable()
export class PairPersistenceService {
    constructor(
        private readonly pairRepository: PairRepository,
        private readonly routerAbi: RouterAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly pairService: PairService,
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

        for (const pairMeta of pairsMetadata) {
            try {
                await this.populatePairModel(pairMeta);
            } catch (error) {
                this.logger.error(error, {
                    context: PairPersistenceService.name,
                });
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
            `${this.refreshPairsPricesAndTVL.name} : ${profiler.duration}ms`,
            {
                context: PairPersistenceService.name,
            },
        );
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
            // TOTO add try catch
            await this.updateStateAndReserves(pair);
        }
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

    async refreshPairsAbiFields(): Promise<void> {
        const pairs = await this.getPairs(
            {},
            {
                address: 1,
            },
        );

        for (const pair of pairs) {
            // TODO add try/catch
            await this.updateAbiFields(pair);
        }
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
}
