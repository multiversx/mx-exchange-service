import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokenRepository } from './token.repository';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken } from '../../models/esdtToken.model';
import { FilterQuery, ProjectionType } from 'mongoose';
import { TokenService } from '../../services/token.service';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairDocument } from 'src/modules/pair/persistence/schemas/pair.schema';
import { AnyBulkWriteOperation } from 'mongodb';
import { PairPersistenceService } from 'src/modules/pair/persistence/services/pair.persistence.service';
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
        @Inject(forwardRef(() => PairPersistenceService))
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateTokens(): Promise<void> {
        const tokenIDs = await this.tokenService.getUniqueTokenIDs(false);

        const counters = {
            added: 0,
            failed: 0,
        };

        for (const tokenID of tokenIDs) {
            const token = await this.tokenService.tokenMetadata(tokenID);
            try {
                await this.upsertToken(token);

                counters.added++;
            } catch (error) {
                counters.failed++;
            }
        }

        console.log(counters);
    }

    async bulkUpdatePairTokensPrice(usdcPrice: number): Promise<void> {
        const uniqueTokens = new Map<string, EsdtToken>();
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        const profiler = new PerformanceProfiler();

        const pairs = await this.pairPersistence.getPairs(
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
                select: ['identifier', 'decimals', 'price', 'derivedEGLD'],
            },
        );

        const egldPriceUSD = this.getEgldPriceInUSD(pairs);

        pairs.forEach((pair) => {
            if (!uniqueTokens.has(pair.firstToken.identifier)) {
                uniqueTokens.set(pair.firstToken.identifier, pair.firstToken);
            }
            if (!uniqueTokens.has(pair.secondToken.identifier)) {
                uniqueTokens.set(pair.secondToken.identifier, pair.secondToken);
            }
        });

        for (const [tokenID, token] of uniqueTokens.entries()) {
            const derivedEGLD = this.computeTokenPriceDerivedEGLD(
                tokenID,
                pairs,
                egldPriceUSD,
            );

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(usdcPrice)
                .toFixed();

            if (token.price === price && token.derivedEGLD === derivedEGLD) {
                continue;
            }

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            derivedEGLD,
                            price,
                        },
                    },
                },
            });
        }

        await this.bulkUpdateTokens(bulkOps, 'bulkUpdatePairTokensPrice');

        profiler.stop();
        console.log(`bulkUpdatePairTokensPrice - ${profiler.duration}`);
    }

    async bulkUpdatePairTokensPriceAlt(usdcPrice: number): Promise<void> {
        const uniqueTokens = new Map<string, EsdtToken>();
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        const profiler = new PerformanceProfiler();

        const pairs = await this.pairPersistence.getPairs(
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
                select: ['identifier', 'decimals', 'price', 'derivedEGLD'],
            },
        );

        const egldPriceUSD = this.getEgldPriceInUSD(pairs);

        pairs.forEach((pair) => {
            if (!uniqueTokens.has(pair.firstToken.identifier)) {
                uniqueTokens.set(pair.firstToken.identifier, pair.firstToken);
            }
            if (!uniqueTokens.has(pair.secondToken.identifier)) {
                uniqueTokens.set(pair.secondToken.identifier, pair.secondToken);
            }
        });

        for (const [tokenID, token] of uniqueTokens.entries()) {
            const derivedEGLD = this.computeTokenPriceDerivedEGLD(
                tokenID,
                pairs,
                egldPriceUSD,
            );

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(usdcPrice)
                .toFixed();

            if (token.price === price && token.derivedEGLD === derivedEGLD) {
                continue;
            }

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            derivedEGLD,
                            price,
                        },
                    },
                },
            });
        }

        await this.bulkUpdateTokens(bulkOps, 'bulkUpdatePairTokensPrice');

        profiler.stop();
        console.log(`bulkUpdatePairTokensPrice - ${profiler.duration}`);
    }

    bulkUpdatePairTokensPriceGemini(
        usdcPrice: number,
        // pairs: PairDocument[],
        pairs: Map<string, PairModel>,
        uniqueTokens: Map<string, EsdtToken>,
    ): AnyBulkWriteOperation<EsdtTokenDocument>[] {
        // 1. Fetch all pairs once, just like before.
        // const pairs = await this.pairPersistence.getPairs(
        //     {},
        //     {
        //         address: 1,
        //         info: 1,
        //         state: 1,
        //         firstToken: 1,
        //         firstTokenPrice: 1,
        //         secondToken: 1,
        //         secondTokenPrice: 1,
        //     },
        //     {
        //         path: 'firstToken secondToken',
        //         select: ['identifier', 'decimals', 'price', 'derivedEGLD'],
        //     },
        // );

        // 2. Pre-process pairs into efficient lookup structures. THIS IS THE KEY OPTIMIZATION.
        // const uniqueTokens = new Map<string, EsdtToken>();
        const tokenToPairsMap = new Map<string, PairModel[]>();

        for (const pair of pairs.values()) {
            // if (!uniqueTokens.has(firstToken.identifier)) {
            //     uniqueTokens.set(firstToken.identifier, firstToken);
            // }
            // if (!uniqueTokens.has(secondToken.identifier)) {
            //     uniqueTokens.set(secondToken.identifier, secondToken);
            // }

            // Add pair to the map for the first token
            if (!tokenToPairsMap.has(pair.firstTokenId)) {
                tokenToPairsMap.set(pair.firstTokenId, []);
            }
            tokenToPairsMap.get(pair.firstTokenId).push(pair);

            // Add pair to the map for the second token
            if (!tokenToPairsMap.has(pair.secondTokenId)) {
                tokenToPairsMap.set(pair.secondTokenId, []);
            }
            tokenToPairsMap.get(pair.secondTokenId).push(pair);
        }

        // 3. Calculate all prices using the efficient map.
        const egldPriceUSD = pairs.get(scAddress.WEGLD_USDC).firstTokenPrice;
        const priceResults = this.calculateTokenPricesDijkstra(
            uniqueTokens,
            tokenToPairsMap,
            egldPriceUSD,
        );

        // 4. Build and execute the bulk update operation.
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];
        for (const [tokenID, newPrices] of priceResults.entries()) {
            const currentToken = uniqueTokens.get(tokenID);
            // Only update if the price or derivedEGLD has actually changed.
            if (currentToken.derivedEGLD === newPrices.derivedEGLD) {
                continue;
            }

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            derivedEGLD: newPrices.derivedEGLD,
                            price: new BigNumber(newPrices.derivedEGLD)
                                .times(egldPriceUSD)
                                .times(usdcPrice)
                                .toFixed(),
                        },
                    },
                },
            });
        }

        return bulkOps;
        // if (bulkOps.length > 0) {
        //     await this.bulkUpdateTokens(
        //         bulkOps,
        //         'bulkUpdatePairTokensPriceOptimized',
        //     );
        // }
    }

    calculateTokenPricesGemini(
        tokens: Map<string, EsdtToken>,
        tokenToPairsMap: Map<string, PairModel[]>,
        egldPriceInUSD: string,
    ): Map<string, { derivedEGLD: string; price: string }> {
        const memo = new Map<string, string>(); // Memoization for derivedEGLD
        const resolving = new Set<string>();
        const results = new Map<
            string,
            { derivedEGLD: string; price: string }
        >();

        const dfs = (tokenID: string): string => {
            if (resolving.has(tokenID)) {
                // CHANGED: Cycle detected
                return '0'; // This path is invalid, so it has 0 value.
            }
            if (memo.has(tokenID)) {
                return memo.get(tokenID);
            }

            // Base cases for price anchors
            if (tokenID === tokenProviderUSD) {
                memo.set(tokenID, '1');
                return '1';
            }
            if (tokenID === constantsConfig.USDC_TOKEN_ID) {
                const price = new BigNumber(1)
                    .dividedBy(egldPriceInUSD)
                    .toFixed();
                memo.set(tokenID, price);
                return price;
            }

            resolving.add(tokenID);

            // REPLACED THE SLOW FILTER WITH A FAST MAP LOOKUP
            let tokenPairs = tokenToPairsMap.get(tokenID) || [];

            // Filter for active pairs and avoid cycles
            if (tokenPairs.length > 1) {
                if (tokenPairs.some((p) => p.state === 'Active')) {
                    tokenPairs = tokenPairs.filter((p) => p.state === 'Active');
                }
            }
            // tokenPairs = tokenPairs.filter((p) => !visitedPairs.has(p.address));

            let largestLiquidityEGLD = new BigNumber(0);
            let priceSoFar = new BigNumber(0);

            for (const pair of tokenPairs) {
                if (new BigNumber(pair.info.totalSupply).lte(0)) {
                    continue;
                }
                // const newVisited = new Set(visitedPairs).add(pair.address);

                let otherToken: EsdtToken;
                let reservesOfOtherToken: string;
                let priceOfThisToken: string;

                if (pair.firstTokenId === tokenID) {
                    otherToken = tokens.get(pair.secondTokenId);
                    reservesOfOtherToken = pair.info.reserves1;
                    priceOfThisToken = pair.firstTokenPrice;
                } else {
                    otherToken = tokens.get(pair.firstTokenId);
                    reservesOfOtherToken = pair.info.reserves0;
                    priceOfThisToken = pair.secondTokenPrice;
                }

                const otherTokenDerivedEGLD = dfs(otherToken.identifier);

                // if (new BigNumber(otherTokenDerivedEGLD).isZero()) {
                //     continue;
                // }

                const egldLocked = new BigNumber(reservesOfOtherToken)
                    .times(`1e-${otherToken.decimals}`)
                    .times(otherTokenDerivedEGLD)
                    .times(`1e${mxConfig.EGLDDecimals}`)
                    .integerValue();

                if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                    largestLiquidityEGLD = egldLocked;
                    priceSoFar = new BigNumber(priceOfThisToken).times(
                        otherTokenDerivedEGLD,
                    );
                }
            }

            resolving.delete(tokenID);

            memo.set(tokenID, priceSoFar.toFixed());
            return priceSoFar.toFixed();
        };

        // Iterate through all tokens and compute their price
        for (const tokenID of tokens.keys()) {
            const derivedEGLD = dfs(tokenID);
            const price = new BigNumber(derivedEGLD)
                .times(egldPriceInUSD)
                .toFixed();
            results.set(tokenID, { derivedEGLD, price });
        }

        return results;
    }

    calculateTokenPricesDijkstra(
        tokens: Map<string, EsdtToken>,
        tokenToPairsMap: Map<string, PairModel[]>,
        egldPriceInUSD: string,
    ): Map<string, { derivedEGLD: string; price: string }> {
        // Data structures for Dijkstra's algorithm
        const prices = new Map<string, string>(); // Stores the final derivedEGLD price for each token
        const liquidity = new Map<string, BigNumber>(); // Stores the liquidity of the best path found so far to each token
        const visited = new Set<string>(); // Tracks tokens whose prices are finalized

        // Use a simple array as a priority queue, sorting it to find the max liquidity token
        const priorityQueue: { tokenId: string; liquidity: BigNumber }[] = [];

        // 1. Initialization
        for (const tokenId of tokens.keys()) {
            prices.set(tokenId, '0');
            liquidity.set(tokenId, new BigNumber(0));
        }

        // Initialize with our anchor token (EGLD). Its price relative to itself is 1, with infinite liquidity.
        // NOTE: You might need to add other anchors like USDC here too.
        prices.set(tokenProviderUSD, '1');
        liquidity.set(tokenProviderUSD, new BigNumber(Infinity));
        priorityQueue.push({
            tokenId: tokenProviderUSD,
            liquidity: new BigNumber(Infinity),
        });

        // 2. Main Loop
        while (priorityQueue.length > 0) {
            // Find the token with the highest liquidity to visit next
            priorityQueue.sort((a, b) => b.liquidity.comparedTo(a.liquidity));
            const { tokenId: currentTokenId } = priorityQueue.shift();

            if (visited.has(currentTokenId)) {
                continue;
            }
            visited.add(currentTokenId);

            const currentTokenPrice = new BigNumber(prices.get(currentTokenId));
            const currentPathLiquidity = liquidity.get(currentTokenId);

            const pairs = tokenToPairsMap.get(currentTokenId) || [];
            for (const pair of pairs) {
                // Determine the neighbor token in the pair
                const isFirstToken = pair.firstTokenId === currentTokenId;
                const neighborToken = isFirstToken
                    ? tokens.get(pair.secondTokenId)
                    : tokens.get(pair.firstTokenId);
                const neighborTokenId = neighborToken.identifier;

                if (visited.has(neighborTokenId)) {
                    continue; // Already found the best path to this neighbor
                }

                // Calculate the liquidity of this specific link (pair)
                const reservesOfCurrentToken = isFirstToken
                    ? pair.info.reserves0
                    : pair.info.reserves1;
                const linkLiquidity = new BigNumber(reservesOfCurrentToken)
                    .times(
                        `1e-${
                            isFirstToken
                                ? tokens.get(pair.firstTokenId).decimals
                                : tokens.get(pair.secondTokenId).decimals
                        }`,
                    )
                    .times(currentTokenPrice)
                    .times(`1e${mxConfig.EGLDDecimals}`)
                    .integerValue();

                // A path is only as strong as its weakest link.
                const newPathLiquidity = BigNumber.min(
                    currentPathLiquidity,
                    linkLiquidity,
                );

                // 3. Update if we found a better path
                if (
                    newPathLiquidity.isGreaterThan(
                        liquidity.get(neighborTokenId),
                    )
                ) {
                    liquidity.set(neighborTokenId, newPathLiquidity);

                    const priceRatio = isFirstToken
                        ? pair.secondTokenPrice
                        : pair.firstTokenPrice;
                    const newNeighborPrice = currentTokenPrice
                        .times(priceRatio)
                        .toFixed();
                    prices.set(neighborTokenId, newNeighborPrice);

                    // Add/update neighbor in the priority queue
                    const existingInQueue = priorityQueue.find(
                        (item) => item.tokenId === neighborTokenId,
                    );
                    if (existingInQueue) {
                        existingInQueue.liquidity = newPathLiquidity;
                    } else {
                        priorityQueue.push({
                            tokenId: neighborTokenId,
                            liquidity: newPathLiquidity,
                        });
                    }
                }
            }
        }

        // Format results
        const results = new Map<
            string,
            { derivedEGLD: string; price: string }
        >();
        for (const [tokenId, derivedEGLD] of prices.entries()) {
            const price = new BigNumber(derivedEGLD)
                .times(egldPriceInUSD)
                .toFixed();
            results.set(tokenId, { derivedEGLD, price });
        }

        return results;
    }

    bulkUpdatePairTokensPriceGrok(
        usdcPrice: number,
        pairs: Map<string, PairModel>,
        uniqueTokens: Map<string, EsdtToken>,
        updatedPairAddresses: string[],
    ): AnyBulkWriteOperation<EsdtTokenDocument>[] {
        if (updatedPairAddresses.length === 0) {
            return;
        }

        // Pre-build adjacency map for fast lookups
        const tokenPairsMap = new Map<string, PairModel[]>();
        pairs.forEach((pair) => {
            const { firstTokenId, secondTokenId } = pair;
            if (!tokenPairsMap.has(firstTokenId)) {
                tokenPairsMap.set(firstTokenId, []);
            }
            tokenPairsMap.get(firstTokenId).push(pair);

            if (!tokenPairsMap.has(secondTokenId)) {
                tokenPairsMap.set(secondTokenId, []);
            }
            tokenPairsMap.get(secondTokenId).push(pair);
        });

        // for (const [token, pairs] of tokenPairsMap.entries()) {
        //     if (token === 'HLT-a1f07e') {
        //         const addresses = pairs.map((pair) => pair.address);
        //         console.log({ token, addresses });
        //     }
        // }
        const egldPriceUSD = pairs.get(scAddress.WEGLD_USDC).firstTokenPrice;

        // Seed dirty tokens from updated pairs
        const dirty = new Set<string>();
        updatedPairAddresses.forEach((addr) => {
            const pair = pairs.get(addr);
            if (pair) {
                dirty.add(pair.firstTokenId);
                dirty.add(pair.secondTokenId);
            }
        });

        if (dirty.size === 0) {
            return;
        }

        const queue: string[] = Array.from(dirty);
        const processed = new Set<string>(); // Track processed to avoid redundant recomputes
        const inQueue = new Set<string>(queue); // Track queued to avoid duplicates
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        // Shared memo for all DFS calls to avoid redundant sub-computations
        const sharedMemo = new Map<string, string>();
        console.log('SIZE', queue.length);
        while (queue.length > 0) {
            const tokenID = queue.shift();
            inQueue.delete(tokenID);
            processed.add(tokenID);

            const token = uniqueTokens.get(tokenID);
            if (!token) {
                continue;
            }

            const oldDerived = token.derivedEGLD || '0';
            const derivedEGLD = this.computeTokenPriceDerivedEGLDGrok(
                tokenID,
                uniqueTokens,
                egldPriceUSD,
                tokenPairsMap,
                sharedMemo, // Pass shared memo
            );

            if (derivedEGLD === oldDerived) {
                continue;
            }

            // Update local for consistency (though not used in DFS)
            // token.derivedEGLD = derivedEGLD;

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(usdcPrice)
                .toFixed();

            // if (price !== token.price) {
            token.price = price;
            token.derivedEGLD = derivedEGLD;

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            derivedEGLD,
                            price,
                        },
                    },
                },
            });
            // }

            // Propagate to neighbors if not already processed or queued
            const tokenPairs = tokenPairsMap.get(tokenID) || [];
            tokenPairs.forEach((pair) => {
                const otherID =
                    pair.firstTokenId === tokenID
                        ? pair.secondTokenId
                        : pair.firstTokenId;
                if (!processed.has(otherID) && !inQueue.has(otherID)) {
                    queue.push(otherID);
                    inQueue.add(otherID);
                }
            });
        }

        // if (bulkOps.length > 0) {
        //     await this.bulkUpdateTokens(bulkOps, 'bulkUpdatePairTokensPrice');
        // }

        return bulkOps;
    }

    computeTokenPriceDerivedEGLDGrok(
        tokenID: string,
        uniqueTokens: Map<string, EsdtToken>,
        egldPriceInUSD: string,
        tokenPairsMap: Map<string, PairModel[]>,
        sharedMemo?: Map<string, string>,
    ): string {
        // const memo = sharedMemo || new Map<string, string>();
        const memo = new Map<string, string>();
        const doNotVisit = new Set<string>();

        if (tokenID === 'HLT-a1f07e') {
            console.log(tokenPairsMap.size);
        }

        const loadPairsForToken = (id: string): PairModel[] => {
            let tokenPairs = tokenPairsMap.get(id) || [];

            if (tokenPairs.length > 1) {
                if (tokenPairs.find((pair) => pair.state === 'Active')) {
                    tokenPairs = tokenPairs.filter(
                        (pair) => pair.state === 'Active',
                    );
                }
            }

            tokenPairs = tokenPairs.filter(
                (pair) => !doNotVisit.has(pair.address),
            );

            for (const p of tokenPairs) {
                doNotVisit.add(p.address);
            }

            return tokenPairs;
        };

        const dfs = (id: string): string => {
            if (memo.has(id)) {
                return memo.get(id);
            }

            if (id === tokenProviderUSD) {
                memo.set(id, '1');
                return '1';
            }

            if (id === constantsConfig.USDC_TOKEN_ID) {
                const price = new BigNumber(1)
                    .dividedBy(egldPriceInUSD)
                    .toFixed();
                memo.set(id, price);
                return price;
            }

            const pairs = loadPairsForToken(id);

            let largestLiquidityEGLD = new BigNumber(0);
            let priceSoFar = new BigNumber(0);

            for (const pair of pairs) {
                if (new BigNumber(pair.info.totalSupply).lte(0)) {
                    continue;
                }

                if (pair.firstTokenId === id) {
                    const secondTokenDerivedEGLD = dfs(pair.secondTokenId);
                    const egldLocked = new BigNumber(pair.info.reserves1)
                        .times(
                            `1e-${
                                uniqueTokens.get(pair.secondTokenId).decimals
                            }`,
                        )
                        .times(secondTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.firstTokenPrice).times(
                            secondTokenDerivedEGLD,
                        );
                    }
                } else {
                    const firstTokenDerivedEGLD = dfs(pair.firstTokenId);
                    const egldLocked = new BigNumber(pair.info.reserves0)
                        .times(
                            `1e-${
                                uniqueTokens.get(pair.firstTokenId).decimals
                            }`,
                        )
                        .times(firstTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.secondTokenPrice).times(
                            firstTokenDerivedEGLD,
                        );
                    }
                }
            }

            const priceSoFarStr = priceSoFar.toFixed();
            memo.set(id, priceSoFarStr);

            return priceSoFarStr;
        };

        return dfs(tokenID);
    }

    async bulkUpdatePairTokensLiquidityUSD(
        commonTokenIDs: string[],
    ): Promise<void> {
        const uniqueTokens = new Map<string, EsdtToken>();
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        const pairs = await this.pairPersistence.getPairs(
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
            },
            {
                path: 'firstToken secondToken liquidityPoolToken',
                select: ['identifier', 'decimals', 'price', 'liquidityUSD'],
            },
        );

        pairs.forEach((pair) => {
            if (!uniqueTokens.has(pair.firstToken.identifier)) {
                uniqueTokens.set(pair.firstToken.identifier, pair.firstToken);
            }
            if (!uniqueTokens.has(pair.secondToken.identifier)) {
                uniqueTokens.set(pair.secondToken.identifier, pair.secondToken);
            }

            if (
                pair.liquidityPoolToken &&
                pair.liquidityPoolToken.price !==
                    pair.liquidityPoolTokenPriceUSD
            ) {
                bulkOps.push({
                    updateOne: {
                        filter: {
                            identifier: pair.liquidityPoolToken.identifier,
                        },
                        update: {
                            $set: {
                                price: pair.liquidityPoolTokenPriceUSD,
                            },
                        },
                    },
                });
            }
        });

        for (const [tokenID, token] of uniqueTokens.entries()) {
            const liquidityUSD = this.computeTokenLiquidityUSD(
                tokenID,
                pairs,
                commonTokenIDs,
            );

            if (token.liquidityUSD === liquidityUSD) {
                continue;
            }

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            liquidityUSD,
                        },
                    },
                },
            });
        }

        await this.bulkUpdateTokens(
            bulkOps,
            'bulkUpdatePairTokensLiquidityUSD',
        );
    }

    computeTokenPriceDerivedEGLD(
        tokenID: string,
        allPairs: PairModel[],
        egldPriceInUSD: string,
    ): string {
        const memo = new Map<string, string>();
        const doNotVisit = new Set<string>();

        const loadPairsForToken = (id: string): PairModel[] => {
            let tokenPairs = allPairs.filter(
                (pair) =>
                    pair.firstToken.identifier === id ||
                    pair.secondToken.identifier === id,
            );

            if (tokenPairs.length > 1) {
                if (tokenPairs.find((pair) => pair.state === 'Active')) {
                    tokenPairs = tokenPairs.filter(
                        (pair) => pair.state === 'Active',
                    );
                }
            }

            tokenPairs = tokenPairs.filter(
                (pair) => !doNotVisit.has(pair.address),
            );

            for (const p of tokenPairs) {
                doNotVisit.add(p.address);
            }

            return tokenPairs;
        };

        const dfs = (id: string): string => {
            if (memo.has(id)) {
                return memo.get(id);
            }

            if (id === tokenProviderUSD) {
                memo.set(id, '1');
                return '1';
            }

            if (id === constantsConfig.USDC_TOKEN_ID) {
                const price = new BigNumber(1)
                    .dividedBy(egldPriceInUSD)
                    .toFixed();
                memo.set(id, price);
                return price;
            }

            const pairs = loadPairsForToken(id);

            let largestLiquidityEGLD = new BigNumber(0);
            let priceSoFar = new BigNumber(0);

            for (const pair of pairs) {
                if (new BigNumber(pair.info.totalSupply).lte(0)) {
                    continue;
                }

                if (pair.firstToken.identifier === id) {
                    const secondTokenDerivedEGLD = dfs(
                        pair.secondToken.identifier,
                    );
                    const egldLocked = new BigNumber(pair.info.reserves1)
                        .times(`1e-${pair.secondToken.decimals}`)
                        .times(secondTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.firstTokenPrice).times(
                            secondTokenDerivedEGLD,
                        );
                    }
                } else {
                    const firstTokenDerivedEGLD = dfs(
                        pair.firstToken.identifier,
                    );
                    const egldLocked = new BigNumber(pair.info.reserves0)
                        .times(`1e-${pair.firstToken.decimals}`)
                        .times(firstTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.secondTokenPrice).times(
                            firstTokenDerivedEGLD,
                        );
                    }
                }
            }

            memo.set(id, priceSoFar.toFixed());

            return priceSoFar.toFixed();
        };

        return dfs(tokenID);
    }

    computeTokenLiquidityUSD(
        tokenID: string,
        pairs: PairDocument[],
        commonTokenIDs: string[],
    ): string {
        const relevantPairs = pairs.filter(
            (pair) =>
                tokenID === pair.firstToken.identifier ||
                pair.secondToken.identifier === tokenID,
        );

        let newLockedValue = new BigNumber(0);
        for (const pair of relevantPairs) {
            if (
                pair.state === 'Active' ||
                (commonTokenIDs.includes(pair.firstToken.identifier) &&
                    commonTokenIDs.includes(pair.secondToken.identifier))
            ) {
                const tokenLockedValueUSD =
                    tokenID === pair.firstToken.identifier
                        ? pair.firstTokenLockedValueUSD
                        : pair.secondTokenLockedValueUSD;
                newLockedValue = newLockedValue.plus(tokenLockedValueUSD);
                continue;
            }

            if (
                !commonTokenIDs.includes(pair.firstToken.identifier) &&
                !commonTokenIDs.includes(pair.secondToken.identifier)
            ) {
                continue;
            }

            const commonTokenLockedValueUSD = commonTokenIDs.includes(
                pair.firstToken.identifier,
            )
                ? new BigNumber(pair.firstTokenLockedValueUSD)
                : new BigNumber(pair.secondTokenLockedValueUSD);

            newLockedValue = newLockedValue.plus(commonTokenLockedValueUSD);
        }

        return newLockedValue.toFixed();
    }

    private getEgldPriceInUSD(pairs: PairDocument[]): string {
        const egldUsdcPair = pairs.find(
            (pair) => pair.address === scAddress.WEGLD_USDC,
        );

        if (!egldUsdcPair) {
            throw new Error(
                'Missing WEGLD/USDC pair. Cannot compute EGLD price in USD',
            );
        }

        return egldUsdcPair.firstTokenPrice;
    }

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

            this.logger.info(`${JSON.stringify(result)}`);
        } catch (error) {
            this.logger.error(error);
        } finally {
            profiler.stop();
        }

        this.logger.info(
            `Bulk update tokens | ${name ?? 'no-op'} - ${[profiler.duration]}`,
        );
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
