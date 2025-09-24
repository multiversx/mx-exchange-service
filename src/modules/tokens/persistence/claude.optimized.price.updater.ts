import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import BigNumber from 'bignumber.js';
import { PairModel } from '../../pair/models/pair.model';
import { EsdtTokenDocument } from './schemas/esdtToken.schema';
import { AnyBulkWriteOperation } from 'mongodb';
import { PairDocument } from 'src/modules/pair/persistence/schemas/pair.schema';
import { constantsConfig, mxConfig, tokenProviderUSD } from 'src/config';

interface PairGraph {
    tokenToPairs: Map<string, Set<string>>; // token ID -> pair addresses
    pairMap: Map<string, PairModel>; // pair address -> pair model
    tokenDependencies: Map<string, Set<string>>; // token -> tokens that depend on it
}

export class ClaudeOptimizedPriceUpdater {
    private pairGraph: PairGraph | null = null;
    private tokenPriceCache = new Map<
        string,
        { derivedEGLD: string; price: string }
    >();

    async bulkUpdatePairTokensPrice(
        pairs: PairDocument[],
        usdcPrice: number,
        egldPriceUSD: string,
        updatedPairAddresses: string[], // NEW: only the pairs that changed
    ): Promise<AnyBulkWriteOperation<EsdtTokenDocument>[]> {
        const profiler = new PerformanceProfiler();

        // Step 1: Build or refresh the graph structure
        const graph = this.getOrBuildPairGraph(pairs);
        // const egldPriceUSD = this.getEgldPriceInUSD([...graph.pairMap.values()]);

        // Step 2: Find ALL affected tokens through dependency analysis
        const affectedTokens = this.findAllAffectedTokens(
            updatedPairAddresses,
            graph,
        );
        console.log(
            `Processing ${affectedTokens.size} affected tokens out of ${graph.tokenToPairs.size} total`,
        );

        // Step 3: Invalidate cache for affected tokens only
        for (const tokenID of affectedTokens) {
            this.tokenPriceCache.delete(tokenID);
        }

        // Step 4: Compute prices only for affected tokens
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];
        const priceComputationCache = new Map<string, string>();

        for (const tokenID of affectedTokens) {
            const derivedEGLD = this.computeTokenPriceDerivedEGLDOptimized(
                tokenID,
                graph,
                egldPriceUSD,
                priceComputationCache,
            );

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(usdcPrice)
                .toFixed();

            // Check against cached value
            const cachedValue = this.tokenPriceCache.get(tokenID);
            if (
                cachedValue?.price === price &&
                cachedValue?.derivedEGLD === derivedEGLD
            ) {
                continue;
            }

            // Update cache
            this.tokenPriceCache.set(tokenID, { derivedEGLD, price });

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

        profiler.stop();
        console.log(
            `Updated ${bulkOps.length} token prices in ${profiler.duration}ms`,
        );
        return bulkOps;
    }

    private getOrBuildPairGraph(pairs: PairDocument[]): PairGraph {
        // Rebuild if cache expired or updated pairs changed
        // if (this.pairGraph) {
        //     return this.pairGraph;
        // }

        const tokenToPairs = new Map<string, Set<string>>();
        const pairMap = new Map<string, PairModel>();
        const tokenDependencies = new Map<string, Set<string>>();

        // Build graph structure
        for (const pair of pairs) {
            pairMap.set(pair.address, pair);

            // Build adjacency list
            if (!tokenToPairs.has(pair.firstToken.identifier)) {
                tokenToPairs.set(pair.firstToken.identifier, new Set());
            }
            if (!tokenToPairs.has(pair.secondToken.identifier)) {
                tokenToPairs.set(pair.secondToken.identifier, new Set());
            }

            tokenToPairs.get(pair.firstToken.identifier).add(pair.address);
            tokenToPairs.get(pair.secondToken.identifier).add(pair.address);

            // Build dependency graph (token A depends on token B if A's price is computed from B)
            if (!tokenDependencies.has(pair.firstToken.identifier)) {
                tokenDependencies.set(pair.firstToken.identifier, new Set());
            }
            if (!tokenDependencies.has(pair.secondToken.identifier)) {
                tokenDependencies.set(pair.secondToken.identifier, new Set());
            }

            // Each token depends on the other token in its pairs
            tokenDependencies
                .get(pair.firstToken.identifier)
                .add(pair.secondToken.identifier);
            tokenDependencies
                .get(pair.secondToken.identifier)
                .add(pair.firstToken.identifier);
        }

        // Sync token price cache with current DB state
        this.syncTokenPriceCache(pairs);

        this.pairGraph = { tokenToPairs, pairMap, tokenDependencies };

        return this.pairGraph;
    }

    private syncTokenPriceCache(pairs: PairModel[]): void {
        // Build initial cache from current token states
        for (const pair of pairs) {
            if (!this.tokenPriceCache.has(pair.firstToken.identifier)) {
                this.tokenPriceCache.set(pair.firstToken.identifier, {
                    derivedEGLD: pair.firstToken.derivedEGLD || '0',
                    price: pair.firstToken.price || '0',
                });
            }
            if (!this.tokenPriceCache.has(pair.secondToken.identifier)) {
                this.tokenPriceCache.set(pair.secondToken.identifier, {
                    derivedEGLD: pair.secondToken.derivedEGLD || '0',
                    price: pair.secondToken.price || '0',
                });
            }
        }
    }

    private findAllAffectedTokens(
        updatedPairAddresses: string[],
        graph: PairGraph,
    ): Set<string> {
        const affectedTokens = new Set<string>();
        const toProcess = new Set<string>();

        // Start with tokens directly in updated pairs
        for (const pairAddr of updatedPairAddresses) {
            const pair = graph.pairMap.get(pairAddr);
            if (pair) {
                toProcess.add(pair.firstToken.identifier);
                toProcess.add(pair.secondToken.identifier);
            }
        }

        // Find all tokens that depend on the changed tokens (reverse dependency traversal)
        const visited = new Set<string>();
        const stack = [...toProcess];

        while (stack.length > 0) {
            const tokenID = stack.pop();

            if (visited.has(tokenID)) {
                continue;
            }

            visited.add(tokenID);
            affectedTokens.add(tokenID);

            // Find tokens that might use this token for their price calculation
            const pairAddresses = graph.tokenToPairs.get(tokenID);
            if (pairAddresses) {
                for (const pairAddr of pairAddresses) {
                    const pair = graph.pairMap.get(pairAddr);
                    if (pair && pair.state === 'Active') {
                        // The other token in this pair depends on current token's price
                        const dependentToken =
                            pair.firstToken.identifier === tokenID
                                ? pair.secondToken.identifier
                                : pair.firstToken.identifier;

                        if (!visited.has(dependentToken)) {
                            stack.push(dependentToken);
                        }
                    }
                }
            }
        }

        return affectedTokens;
    }

    private computeTokenPriceDerivedEGLDOptimized(
        tokenID: string,
        graph: PairGraph,
        egldPriceInUSD: string,
        memo: Map<string, string>,
    ): string {
        // Check persistent cache first
        if (!graph.tokenToPairs.has(tokenID)) {
            const cached = this.tokenPriceCache.get(tokenID);
            if (cached) {
                return cached.derivedEGLD;
            }
        }

        const doNotVisit = new Set<string>();

        const dfs = (id: string): string => {
            if (memo.has(id)) {
                return memo.get(id);
            }

            // Check persistent cache for unaffected tokens
            const cached = this.tokenPriceCache.get(id);
            if (cached && cached.derivedEGLD !== '0') {
                // Use cached value if this token wasn't marked as affected
                memo.set(id, cached.derivedEGLD);
                return cached.derivedEGLD;
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

            const pairAddresses = graph.tokenToPairs.get(id) || new Set();
            const pairs: PairModel[] = [];

            for (const addr of pairAddresses) {
                if (!doNotVisit.has(addr)) {
                    const pair = graph.pairMap.get(addr);
                    if (
                        pair &&
                        (pairs.length === 0 || pair.state === 'Active')
                    ) {
                        pairs.push(pair);
                        doNotVisit.add(addr);
                    }
                }
            }

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

    // Optional: Method to invalidate cache when major changes occur
    public invalidatePriceCache(): void {
        this.tokenPriceCache.clear();
        this.pairGraph = null;
    }
}
