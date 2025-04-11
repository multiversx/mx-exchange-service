import { Address } from '@multiversx/sdk-core/out';
import {
    BinaryUtils,
    Constants,
    ContextTracker,
} from '@multiversx/sdk-nestjs-common';
import { Injectable, NotFoundException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import {
    BaseEsdtToken,
    EsdtToken,
} from 'src/modules/tokens/models/esdtToken.model';
// import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import {
    Block,
    ESBlocksService,
} from 'src/services/elastic-search/services/es.blocks.service';
import {
    ESOperationsService,
    Operation,
} from 'src/services/elastic-search/services/es.operations.service';
import {
    HistoricalSwapRepositoryService,
    PairSnapshotRepositoryService,
} from './repository.service';
import { HistoricalSwapDbModel } from '../schemas/historical.swap.schema';
import { PairSnapshotDbModel } from '../schemas/pair.snapshot.schema';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';

export type BenchmarkSnapshot = {
    pairs: PairModel[];
    tokensMetadata: Map<string, BaseEsdtToken>;
    // tokensPriceUSD: Map<string, string>;
};

export type BenchmarkSnapshotResponse = {
    pairs: PairModel[];
    tokensMetadata: EsdtToken[];
};

@Injectable()
export class SwapBenchmarkSnapshotService {
    baseKey: string;
    snapshotTtl: number;

    constructor(
        private readonly cacheService: CacheService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly tokenService: TokenService,
        // private readonly tokenCompute: TokenComputeService,
        private readonly esBlocksService: ESBlocksService,
        private readonly esOperationsService: ESOperationsService,
        private readonly historicalSwapRepository: HistoricalSwapRepositoryService,
        private readonly pairSnapshotRepository: PairSnapshotRepositoryService,
    ) {
        this.baseKey = 'swapBenchmark';
        this.snapshotTtl = Constants.oneDay();
    }

    async getAvailableSnapshots(): Promise<number[]> {
        const snapshotIds = await this.cacheService.get<number[]>(
            `${this.baseKey}.timestamps`,
        );

        if (!snapshotIds) return [];

        return snapshotIds.sort((a, b) => a - b);
    }

    async testSnapshotsPairs(): Promise<string> {
        const start = {
            timestamp: 1740959472,
            nonce: 24120611,
        };
        // const end = {
        //     timestamp: 1741125420,
        //     nonce: 24148231,
        // };

        ContextTracker.assign({
            deepHistoryTimestamp: start.timestamp,
            blockNonce: start.nonce,
        });

        const startPairs = await this.getActivePairsFees();

        const dbSwaps = await this.historicalSwapRepository.find({});
        console.log(dbSwaps.length);

        for (const swap of dbSwaps) {
            const entity: PairSnapshotDbModel = {
                timestamp: swap.prevBlockTimestamp,
                blockNonce: swap.prevBlockNonce,
                pairs: startPairs,
                reservesInitialised: false,
            };

            try {
                await this.pairSnapshotRepository.create(entity);
            } catch (error) {
                console.log(error);
                console.log(swap.timestamp);
            }
        }

        // console.log('Start pairs', startPairs.size);

        // ContextTracker.unassign();
        // ContextTracker.assign({
        //     deepHistoryTimestamp: end.timestamp,
        //     blockNonce: end.nonce,
        // });
        // const endPairs = await this.getActivePairsFees();
        // console.log('End pairs', endPairs.size);

        // for (const pair of endPairs.values()) {
        //     const startPair = startPairs.get(pair.address);
        //     if (!startPair) {
        //         console.log('Missing from start pairs', pair.address);
        //         continue;
        //     }

        //     if (startPair.totalFeePercent !== pair.totalFeePercent) {
        //         console.log(
        //             'Different fee perc',
        //             pair.address,
        //             pair.totalFeePercent,
        //             startPair.totalFeePercent,
        //         );
        //     }
        // }

        return 'ok';
    }

    async getActivePairsFees(): Promise<PairModel[]> {
        const pairMetadata = await this.routerAbi.pairsMetadata();

        const states = await this.pairService.getAllStates(
            pairMetadata.map((pair) => pair.address),
        );

        const activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        const pairAddresses: string[] = [];
        let tokenIDs: string[] = [];
        activePairs.forEach((pair) => {
            pairAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const [allTotalFeePercent, allTokens] = await Promise.all([
            this.pairAbi.getAllPairsTotalFeePercent(pairAddresses),
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
        ]);

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        const pairs = activePairs.map((pair, index) => {
            return new PairModel({
                address: pair.address,
                firstToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.firstTokenID),
                ),
                secondToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.secondTokenID),
                ),
                totalFeePercent: allTotalFeePercent[index],
            });
        });

        return pairs;
    }

    async fixMissingPairsReset(): Promise<string> {
        const pairSnapshot = await this.pairSnapshotRepository.find({
            timestamp: { $lt: 1741125600 },
        });
        // console.log(dbSwaps.length);

        for (const snapshot of pairSnapshot) {
            const { timestamp } = snapshot;

            const swap = await this.historicalSwapRepository.findOne({
                prevBlockTimestamp: timestamp,
            });

            const blockNonce = swap.prevBlockNonce;

            console.log(
                `Timestamp : ${timestamp} | Block nonce : ${blockNonce}`,
            );

            await this.pairSnapshotRepository.findOneAndUpdate(
                { timestamp: snapshot.timestamp },
                { blockNonce: blockNonce, reservesInitialised: false },
            );
        }

        return 'ok';
    }

    fixPairsFeePercentage(pairs: PairModel[]): {
        pairs: PairModel[];
        needUpdate: number;
    } {
        let needUpdate = 0;

        for (const pair of pairs) {
            if (pair.totalFeePercent > 50) {
                // console.log()
                const totalFeePercent = pair.totalFeePercent;
                pair.totalFeePercent = new BigNumber(totalFeePercent)
                    .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                    .toNumber();
                needUpdate += 1;
            }
        }

        return {
            pairs,
            needUpdate,
        };
    }

    async testSnapshots(): Promise<string> {
        // const pairSnapshots = await this.pairSnapshotRepository.findPaginated(
        //     {},
        //     1,
        //     0,
        // );

        const snapshotModel = this.pairSnapshotRepository.getEntity();
        const snapshots = await snapshotModel.find({}, 'timestamp').exec();

        const timestamps = snapshots.map((s) => s.timestamp);

        const buckets = this.groupTimestampsByHour(timestamps);
        const result = [];
        for (const [bucket, entries] of Object.entries(buckets)) {
            // if (entries.length > 0) {
            //     console.log(bucket, entries.length);
            // }
            result.push(entries[entries.length - 1]);
            // console.log(entries[entries.length - 1]);
        }

        console.log(result.join(','));
        // const model = this.pairSnapshotRepository.getEntity();
        // await model.updateMany({}, { reservesInitialised: false });

        // console.log(pairSnapshots[0].timestamp);

        return 'ok';
    }

    groupTimestampsByHour(timestamps: number[]): Record<number, number[]> {
        const buckets: Record<number, number[]> = {};

        for (const ts of timestamps) {
            // Convert timestamp to the "start of its hour" in Unix time
            const hourStart = Math.floor(ts / 3600) * 3600;

            if (!buckets[hourStart]) {
                buckets[hourStart] = [];
            }

            buckets[hourStart].push(ts);
        }

        return buckets;
    }

    async createEmptyPairSnapshots(): Promise<string> {
        // initialise snapshots with empty records
        const dbSwaps = await this.historicalSwapRepository.find({
            timestamp: { $gt: 1741557695 },
        });
        console.log(dbSwaps.length);

        for (const swap of dbSwaps) {
            const entity: PairSnapshotDbModel = {
                timestamp: swap.prevBlockTimestamp,
                blockNonce: swap.prevBlockNonce,
                pairs: [],
                reservesInitialised: false,
            };

            try {
                await this.pairSnapshotRepository.create(entity);
            } catch (error) {
                console.log(error);
                console.log(swap.timestamp);
            }
        }
        return 'ok';
    }

    async indexFromElastic(): Promise<string> {
        const start = 1741557601;
        const end = 1741730400;
        // const start = 1741384801;  // 3d batch ~219 swaps
        // const end = 1741557600;    // 3d batch ~219 swaps
        // const start = 1741125601; // 2nd batch ~367 swaps
        // const end = 1741384800;  // 2nd batch ~367 swaps
        // const start = 1740952800;  // missing 15 pairs
        // const end = 1741125600; // missing 15 pairs

        const operations = await this.esOperationsService.getRouterMultiSwapTxs(
            start,
            end,
        );

        console.log('OPERATIONS', operations.length);

        let currentBlock: Block = null;
        let currentTimestamp: number = null;
        let foundTxForTimestamp = false;
        for (const [index, operation] of operations.entries()) {
            // console.log(`iteration ${index}`);

            // if (index !== 40) {
            //     continue;
            // }

            if (
                currentTimestamp === operation.timestamp &&
                foundTxForTimestamp
            ) {
                continue;
            }

            const txHash =
                operation.originalTxHash !== undefined
                    ? operation.prevTxHash !== operation.originalTxHash
                        ? operation.prevTxHash
                        : operation.originalTxHash
                    : operation._search;

            const decodedData = Buffer.from(operation.data, 'base64')
                .toString('utf8')
                .split('@');
            let foundFixedOutput = false;
            for (const segment of decodedData) {
                const decoded = BinaryUtils.hexToString(segment);
                if (decoded === 'swapTokensFixedOutput') {
                    foundFixedOutput = true;
                    break;
                }
            }
            if (foundFixedOutput) {
                // console.log('FOUND FIXED OUTPUT', index, txHash);
                continue;
            }

            if (currentTimestamp !== operation.timestamp) {
                // console.log(`fetch block at timestamp ${operation.timestamp}`);

                const dbSwap = await this.historicalSwapRepository.findOne({
                    timestamp: operation.timestamp,
                });
                if (dbSwap) {
                    console.log('exists in db already', operation.timestamp);
                    continue;
                }

                currentBlock =
                    await this.esBlocksService.getBlockByMiniBlockHash(
                        operation.miniBlockHash,
                        1,
                    );
                foundTxForTimestamp = false;
            } else {
                // console.log('same timestamp, skip block fetch');
            }

            currentTimestamp = operation.timestamp;

            const miniBlockIndex = currentBlock.miniBlocksDetails.findIndex(
                (miniBlock) => miniBlock.txsHashes.includes(txHash),
            );

            // console.log(operation._search);
            // console.log('BLOCK', currentBlock);

            if (miniBlockIndex === -1) {
                console.log(`could not find miniblock with tx ${txHash}`);
                continue;
            }

            const miniBlock = currentBlock.miniBlocksDetails[miniBlockIndex];

            // if (currentBlock.txCount === 1) {
            //   // no need to look further. get prev block nonce / timestamp
            //   console.log('Block with single tx');
            //   continue;
            // }

            const txIndex = miniBlock.txsHashes.findIndex(
                (hash) => hash === txHash,
            );

            if (txIndex === -1) {
                console.log(`could not find tx ${txHash} in miniblock`);
                continue;
            }

            // console.log(
            //     'Exec order',
            //     miniBlock.executionOrderTxsIndices[txIndex],
            // );

            if (miniBlock.executionOrderTxsIndices[txIndex] === 0) {
                foundTxForTimestamp = true;
                // console.log('OK timestamp', currentTimestamp, operation);
                // console.log('BLOCK', currentBlock);
                // console.log('MINI BLOCK', miniBlock);
                const result = await this.processTransaction(
                    // txHash,
                    operation,
                    currentBlock,
                );

                if (result === true) {
                    console.log(
                        'OK timestamp',
                        currentTimestamp,
                        index,
                        txHash,
                    );
                    // break;
                }
                // break;
                // do processing in another func;
            }

            // console.log(txHash);

            // console.log(currentBlock);
            // if (index === 50) {
            //     break;
            // }
        }

        return 'ok';
    }

    async processTransaction(
        operation: Operation,
        block: Block,
    ): Promise<boolean> {
        const knownSCs = [
            scAddress.positionCreator,
            scAddress.lockedTokenPositionCreator,
            scAddress.composableTasks,
            scAddress.routerAddress,
        ];
        const sender = Address.newFromBech32(operation.sender);

        // const originalSender = operation.originalSender
        //     ? Address.newFromBech32(operation.originalSender)
        //     : null;

        if (sender.isSmartContract() && !knownSCs.includes(sender.toBech32())) {
            return false;
        }

        const txHash =
            operation.originalTxHash !== undefined
                ? operation.originalTxHash
                : operation._search;

        const tokenOutput =
            await this.esOperationsService.getTokenOutputForMultiSwap(
                txHash,
                scAddress.routerAddress,
                sender.toBech32(),
            );

        if (tokenOutput === undefined) {
            console.log('MISSING OUTPUT', txHash);
            return false;
            // console.log('MISSING OUTPUT', {
            //     txHash,
            //     sender: scAddress.routerAddress,
            //     receiver: sender.toBech32(),
            // });
        }

        const prevBlock = await this.esBlocksService.getBlockByHash(
            block.prevHash,
        );

        const entity: HistoricalSwapDbModel = {
            timestamp: block.timestamp,
            prevBlockTimestamp: prevBlock.timestamp,
            prevBlockNonce: prevBlock.nonce,
            tokenIn: operation.tokens[0],
            amountIn: operation.esdtValues[0],
            expectedAmountOut: '0',
            actualAmountOut: tokenOutput.amount,
            tokenOut: tokenOutput.tokenID,
            originalTx: JSON.stringify(operation),
            autoRouterAmountOut: '0',
            autoRouterIntermediaryAmounts: [],
            autoRouterRoute: [],
            smartRouterAmountOut: '0',
            smartRouterIntermediaryAmounts: [],
            smartRouterRoutes: [],
            txIntermediaryAmounts: [],
            txRoute: [],
        };

        try {
            await this.historicalSwapRepository.create(entity);
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }

        // console.log(tokenOutput);
        // console.log(operation);
        // console.log('curr timestamp', block.timestamp);
        // console.log('prev timestamp', prevBlock.timestamp);
        // console.log('prev nonce', prevBlock.nonce);
    }

    async testSnapshotsOld(): Promise<string> {
        // const timestamps = [1743596688, 1743596694];
        const timestamps = [1743596700, 1743596694];

        const snap1 = await this.getSnapshot(timestamps[0]);
        const snap2 = await this.getSnapshot(timestamps[1]);

        console.log('S1', snap1.pairs.length);
        console.log('S2', snap2.pairs.length);
        for (let i = 0; i < snap1.pairs.length; i++) {
            const snap1Info = snap1.pairs[i].info;
            const snap2Info = snap2.pairs[i].info;
            const pairName = `${
                snap1.pairs[i].firstToken.identifier.split('-')[0]
            }-${snap1.pairs[i].secondToken.identifier.split('-')[0]}`;
            if (snap1Info.reserves0 !== snap2Info.reserves0) {
                const diff = new BigNumber(snap1Info.reserves0)
                    .minus(snap2Info.reserves0)
                    .toFixed();
                console.log('R0 diff', pairName, diff);
            }
            if (snap1Info.reserves1 !== snap2Info.reserves1) {
                const diff = new BigNumber(snap1Info.reserves1)
                    .minus(snap2Info.reserves1)
                    .toFixed();
                console.log('R1 diff', pairName, diff);
            }
        }
        return 'ok';
    }

    async getTokensMetadata(): Promise<Map<string, BaseEsdtToken>> {
        const pairMetadata = await this.routerAbi.pairsMetadata();

        let tokenIDs: string[] = [];
        pairMetadata.forEach((pair) => {
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const allTokens = await this.tokenService.getAllBaseTokensMetadata(
            tokenIDs,
        );

        return new Map(allTokens.map((token) => [token.identifier, token]));
    }

    async getPairSnapshotFromDb(timestamp: number): Promise<PairModel[]> {
        const snapshot = await this.pairSnapshotRepository.findOne({
            timestamp: timestamp,
        });

        if (!snapshot) {
            throw new Error(`Could not find snapshot ${timestamp} in db`);
        }

        return snapshot.pairs;
    }

    async getSnapshot(timestamp: number): Promise<BenchmarkSnapshot> {
        // const [pairs, tokensMetadata, tokensPriceUSD] = await Promise.all([
        const [pairs, tokensMetadata] = await Promise.all([
            this.cacheService.get<PairModel[]>(
                `${this.baseKey}.pairs.${timestamp}`,
            ),
            this.cacheService.get<BaseEsdtToken[]>(
                `${this.baseKey}.tokens.${timestamp}`,
            ),
            // this.cacheService.get<string[]>(
            //     `${this.baseKey}.tokensPriceUSD.${timestamp}`,
            // ),
        ]);

        // if (!pairs || !tokensMetadata || !tokensPriceUSD) {
        if (!pairs || !tokensMetadata) {
            throw new NotFoundException(
                `Snapshot missing for timestamp ${timestamp}`,
            );
        }

        return {
            pairs,
            tokensMetadata: new Map(
                tokensMetadata.map((token) => [token.identifier, token]),
            ),
            // tokensPriceUSD: new Map(
            //     tokensMetadata.map((token, index) => [
            //         token.identifier,
            //         tokensPriceUSD[index],
            //     ]),
            // ),
        };
    }

    async createSnapshotForTimestamp(timestamp: number): Promise<void> {
        const block = await this.esBlocksService.getBlockByTimestampAndShardId(
            timestamp,
            1,
        );

        if (!block) {
            throw new Error(
                `Could not determine block for timestamp ${timestamp}`,
            );
        }

        const blockNonce = block.nonce;

        console.log(`Timestamp : ${timestamp} | Block nonce : ${blockNonce}`);
        ContextTracker.assign({
            deepHistoryTimestamp: timestamp,
            blockNonce: blockNonce,
        });

        const [activePairs, uniqueTokens] =
            await this.getActivePairsAndTokensRaw(timestamp);

        // const tokenIDs = [...uniqueTokens.keys()];
        // const allTokensPriceUSD =
        //     await this.tokenCompute.getAllTokensPriceDerivedUSD(tokenIDs);

        await Promise.all([
            this.cacheService.set(
                `${this.baseKey}.pairs.${timestamp}`,
                activePairs,
                this.snapshotTtl,
                this.snapshotTtl,
            ),
            this.cacheService.set(
                `${this.baseKey}.tokens.${timestamp}`,
                [...uniqueTokens.values()],
                this.snapshotTtl,
                this.snapshotTtl,
            ),
            // this.cacheService.set(
            //     `${this.baseKey}.tokensPriceUSD.${timestamp}`,
            //     allTokensPriceUSD,
            //     this.snapshotTtl,
            //     this.snapshotTtl,
            // ),
        ]);

        const currentSnapshots = await this.getAvailableSnapshots();

        await this.setAvailableSnapshots([...currentSnapshots, timestamp]);
    }

    async getPairsInfo(
        timestamp: number,
        addresses: string[],
    ): Promise<PairInfoModel[]> {
        const block = await this.esBlocksService.getBlockByTimestampAndShardId(
            timestamp,
            1,
        );

        if (!block) {
            throw new Error(
                `Could not determine block for timestamp ${timestamp}`,
            );
        }

        const blockNonce = block.nonce;

        console.log(`Timestamp : ${timestamp} | Block nonce : ${blockNonce}`);
        ContextTracker.assign({
            deepHistoryTimestamp: timestamp,
            blockNonce: blockNonce,
        });
        const result = await this.pairAbi.getAllPairsInfoMetadata(addresses);
        ContextTracker.unassign();

        return result;
    }

    async fixMissingPairs(
        timestamp: number,
        blockNonce: number,
        currentPairs: PairModel[],
    ): Promise<PairModel[]> {
        console.log(`Timestamp : ${timestamp} | Block nonce : ${blockNonce}`);

        ContextTracker.assign({
            deepHistoryTimestamp: timestamp,
            blockNonce: blockNonce,
        });

        const pairMetadata = await this.routerAbi.getPairsMetadataRaw();

        let tokenIDs: string[] = [];
        pairMetadata.forEach((pair) => {
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const allTokens = await this.tokenService.getAllBaseTokensMetadata(
            tokenIDs,
        );
        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        const result: PairModel[] = [];
        for (const pair of pairMetadata) {
            const existingPair = currentPairs.find(
                (p) => p.address === pair.address,
            );

            if (existingPair !== undefined) {
                result.push(existingPair);
                continue;
            }

            const [info, totalFeePercent, state] = await Promise.all([
                this.pairAbi.getPairInfoMetadataRaw(pair.address),
                this.pairAbi.getTotalFeePercentRaw(pair.address),
                this.pairAbi.getStateRaw(pair.address),
            ]);

            if (state !== 'Active') {
                continue;
            }

            console.log('adding new pair', pair.address);

            result.push(
                new PairModel({
                    address: pair.address,
                    firstToken: BaseEsdtToken.toEsdtToken(
                        tokenMap.get(pair.firstTokenID),
                    ),
                    secondToken: BaseEsdtToken.toEsdtToken(
                        tokenMap.get(pair.secondTokenID),
                    ),
                    info,
                    totalFeePercent,
                }),
            );
        }

        return result;

        // let tokenIDs: string[] = [];
        // pairMetadata.forEach((pair) => {
        //     pairAddresses.push(pair.address);
        //     tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        // });
        // tokenIDs = [...new Set(tokenIDs)];

        // const allTokens = await this.tokenService.getAllBaseTokensMetadata(
        //     tokenIDs,
        // );
        // const tokenMap = new Map(
        //     allTokens.map((token) => [token.identifier, token]),
        // );

        // const result: PairModel[] = [];
        // for (const pair of pairMetadata) {
        //     const [info, totalFeePercent, state] = await Promise.all([
        //         this.pairAbi.getPairInfoMetadataRaw(pair.address),
        //         this.pairAbi.getTotalFeePercentRaw(pair.address),
        //         this.pairAbi.getStateRaw(pair.address),
        //     ]);

        //     if (state !== 'Active') {
        //         continue;
        //     }

        //     result.push(
        //         new PairModel({
        //             address: pair.address,
        //             firstToken: BaseEsdtToken.toEsdtToken(
        //                 tokenMap.get(pair.firstTokenID),
        //             ),
        //             secondToken: BaseEsdtToken.toEsdtToken(
        //                 tokenMap.get(pair.secondTokenID),
        //             ),
        //             info,
        //             totalFeePercent,
        //         }),
        //     );
        // }

        // ContextTracker.unassign();
    }

    async getPairs(
        timestamp: number,
        blockNonce: number,
    ): Promise<PairModel[]> {
        console.log(`Timestamp : ${timestamp} | Block nonce : ${blockNonce}`);

        ContextTracker.assign({
            deepHistoryTimestamp: timestamp,
            blockNonce: blockNonce,
        });

        const pairMetadata = await this.routerAbi.getPairsMetadataRaw();

        const pairAddresses: string[] = [];
        let tokenIDs: string[] = [];
        pairMetadata.forEach((pair) => {
            pairAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const allTokens = await this.tokenService.getAllBaseTokensMetadata(
            tokenIDs,
        );
        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        const result: PairModel[] = [];
        for (const pair of pairMetadata) {
            const [info, totalFeePercent, state] = await Promise.all([
                this.pairAbi.getPairInfoMetadataRaw(pair.address),
                this.pairAbi.getTotalFeePercentRaw(pair.address),
                this.pairAbi.getStateRaw(pair.address),
            ]);

            if (state !== 'Active') {
                continue;
            }

            result.push(
                new PairModel({
                    address: pair.address,
                    firstToken: BaseEsdtToken.toEsdtToken(
                        tokenMap.get(pair.firstTokenID),
                    ),
                    secondToken: BaseEsdtToken.toEsdtToken(
                        tokenMap.get(pair.secondTokenID),
                    ),
                    info,
                    totalFeePercent,
                }),
            );
        }

        ContextTracker.unassign();

        return result;
    }

    private async getActivePairsAndTokensRaw(
        timestamp: number,
    ): Promise<[PairModel[], Map<string, BaseEsdtToken>]> {
        const pairMetadata = await this.routerAbi.pairsMetadata();

        const states = await this.pairService.getAllStates(
            pairMetadata.map((pair) => pair.address),
        );

        const activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        const pairAddresses: string[] = [];
        let tokenIDs: string[] = [];
        activePairs.forEach((pair) => {
            pairAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const [allInfo, allTotalFeePercent, allTokens] = await Promise.all([
            this.pairAbi.getAllPairsInfoMetadata(pairAddresses),
            this.pairAbi.getAllPairsTotalFeePercent(pairAddresses),
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
        ]);

        for (const [index, address] of pairAddresses.entries()) {
            await Promise.all([
                this.cacheService.set(
                    `pair.firstTokenReserve.${address}.${timestamp}`,
                    allInfo[index].reserves0,
                    CacheTtlInfo.ContractState.remoteTtl,
                    CacheTtlInfo.ContractState.localTtl,
                ),
                this.cacheService.set(
                    `pair.secondTokenReserve.${address}.${timestamp}`,
                    allInfo[index].reserves1,
                    CacheTtlInfo.ContractState.remoteTtl,
                    CacheTtlInfo.ContractState.localTtl,
                ),
                this.cacheService.set(
                    `pair.totalSupply.${address}.${timestamp}`,
                    allInfo[index].totalSupply,
                    CacheTtlInfo.ContractState.remoteTtl,
                    CacheTtlInfo.ContractState.localTtl,
                ),
            ]);
        }

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        const pairs = activePairs.map((pair, index) => {
            return new PairModel({
                address: pair.address,
                firstToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.firstTokenID),
                ),
                secondToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.secondTokenID),
                ),
                info: allInfo[index],
                totalFeePercent: allTotalFeePercent[index],
            });
        });

        return [pairs, tokenMap];
    }

    private async setAvailableSnapshots(timestamps: number[]): Promise<void> {
        await this.cacheService.set(
            `${this.baseKey}.timestamps`,
            timestamps,
            this.snapshotTtl,
            this.snapshotTtl,
        );
    }
}
